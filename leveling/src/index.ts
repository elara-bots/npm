import { discord, hasBit, is, p } from "@elara-services/utils";
import type { APIEmbed } from "discord-api-types/v10";
import {
    Client,
    Message,
    TextBasedChannel,
    VoiceState,
    type GuildMember,
    type PartialGuildMember,
} from "discord.js";
import { EventEmitter } from "events";
import type { CachedOptions, Settings, UserCache, Users } from "./interfaces";
import { Database } from "./services";
import { API } from "./services/api";
import {
    getClientIntents,
    getMinutes,
    getVoiceMultiplier,
    incUserStat,
    parser,
    random,
} from "./utils";
export type * from "./interfaces";
export type * from "./services";
export type * from "./services/api";
export * from "./utils";

const cached = new Set();

export class Leveling extends Database {
    /**
     * The manager to configure the leveling data ()
     */
    api = new API(this);
    /**
     * A boolean to make sure the package only listens to the events ONCE
     */
    #listening = false;
    #events = new EventEmitter();
    public constructor(
        public client: Client,
        mongodbURI: string,
        dbName = "Leveling",
    ) {
        super(mongodbURI, client, dbName);
    }

    /**
     * Emits when the cooldown is added for the user
     */
    public onCooldown(
        listener: (message: Message<true>, cooldown: UserCache) => unknown,
    ) {
        return this.#events.on("cooldown", listener);
    }
    /**
     * Emits when someone levels up in a server.
     */
    public onLevelUp(
        listener: (
            member: GuildMember,
            profile: Users & { _id: string },
            server: Settings & { _id: string },
            level: number,
        ) => unknown,
    ) {
        return this.#events.on("level", listener);
    }

    /**
     * Emits when someone gains xp in a server.
     */
    public onXP(
        listener: (
            member: GuildMember,
            profile: Users & { _id: string },
            server: Settings & { _id: string },
            xp: number,
        ) => unknown,
    ) {
        return this.#events.on("xp", listener);
    }

    /**
     * Use this to start listening for events and automatically handle xp/leveling
     */
    async start() {
        if (this.#listening) {
            return true;
        }
        this.#listening = true;
        const intents = getClientIntents(this.client);
        if (hasBit(intents, 512 /* Guild Messages */)) {
            this.client.on("messageCreate", (m) => void this.#messageCreate(m));
        }
        if (hasBit(intents, 2 /* Guild Members */)) {
            this.client.on("guildMemberRemove", (m) =>
                this.#guildMemberRemove(m),
            );
        }
        if (hasBit(intents, 128 /* Guild Voice States */)) {
            this.client.on("voiceStateUpdate", (o, n) =>
                this.#voiceStateUpdate(o, n),
            );
        }
    }

    async #voiceStateUpdate(old: VoiceState, voice: VoiceState) {
        if (
            !old ||
            !voice ||
            !voice.guild ||
            !voice.guild.available ||
            !voice.member ||
            voice.member.user.bot
        ) {
            return;
        }
        // @ts-ignore
        const db = await this.getSettings(voice.guild.id);
        if (!db || !db.enabled || !db.toggles.voice) {
            return;
        }
        if (
            is.array(db.ignore.channels) &&
            db.ignore.channels.some((c) =>
                [voice.channelId, voice.channel?.parentId].includes(c),
            )
        ) {
            return; // Ignore the user / XP earned in this channel.
        }
        if (
            is.array(db.ignore.users) &&
            db.ignore.users.includes(voice.member.id)
        ) {
            return; // Ignore if the user is ignored.
        }
        if (
            is.array(db.ignore.roles) &&
            voice.member.roles.cache.hasAny(...db.ignore.roles)
        ) {
            return; // Ignore if the user has any of the ignore roles.
        }
        if (
            db.toggles.voice.shouldBeUnmuted === true &&
            [voice.deaf, voice.mute].includes(true)
        ) {
            return;
        }
        // @ts-ignore
        const user = await this.getUser(voice.member.user.id, voice.guild.id);
        if (!user || user.toggles.locked) {
            return;
        }

        const now = Date.now();
        let [voiceDuration, voiceMinutes] = [0, 0];
        if (user.voice.duration) {
            voiceMinutes = parseInt(
                ((now - user.voice.duration) / 60000).toFixed(0),
            );
            voiceDuration = parseInt(
                ((now - user.voice.duration) / 1000).toFixed(0),
            );
        }
        const xpToGive = Math.floor(
            Math.min(
                voiceDuration * user.voice.multiplier,
                20 * 25 * 3 * user.voice.multiplier,
            ),
        );
        if (!old.channelId && voice.channelId) {
            user.voice.multiplier = getVoiceMultiplier(voice);
            user.voice.duration = now;
        }
        if (old.channelId && voice.channelId) {
            user.voice.multiplier = getVoiceMultiplier(voice);
        }
        if (old.channelId && !voice.channelId) {
            if (db.toggles.weekly.track && is.number(voiceMinutes)) {
                // @ts-ignore
                await this.weekly.add(voice.member.guild.id, {
                    stats: { voice: voiceMinutes },
                    users: [{ userId: voice.member.id, voice: voiceMinutes }],
                });
            }
            if (is.number(xpToGive)) {
                await this.handleLevelups(
                    voice.member,
                    voice.channel ?? old.channel,
                    xpToGive,
                    db,
                    voiceMinutes,
                );
            }
            user.voice.duration = 0;
            user.voice.multiplier = 0;
        }
        await user.save().catch(() => null);
    }

    async #guildMemberRemove(m: GuildMember | PartialGuildMember) {
        // @ts-ignore
        const db = await this.getSettings(m.guild.id);
        if (!db || !db.enabled || !db.toggles.resetOnLeave) {
            return;
        }
        await this.dbs.users
            .deleteOne({ userId: m.user.id, guildId: m.guild.id })
            .catch(() => null);
        return;
    }

    async #messageCreate(message: Message) {
        if (!message.inGuild() || !message.guild.available) {
            return;
        }
        let member = message.member;
        let author = message.author;
        let isSlash = false;
        if (author.bot && message.interaction) {
            isSlash = true;
            author = message.interaction.user;
            member = await discord.member(message.guild, author.id, true);
        }
        if (author.bot) {
            return;
        }
        if (!member) {
            return;
        }
        // @ts-ignore
        const db = await this.getSettings(message.guildId);
        if (!db || !db.enabled) {
            return;
        }
        if (isSlash) {
            if (!db.toggles.earnXPOnSlashCommands) {
                return;
            }
        }
        let xp = random(Math.floor(db.xp.min || 1), Math.floor(db.xp.max || 8));
        const multipliers = [];
        if (is.array(db.multipliers)) {
            for (const m of db.multipliers) {
                if (member.roles.cache.hasAny(...m.roles)) {
                    multipliers.push(m.multiplier);
                }
                if (
                    m.channels.includes(message.channelId) ||
                    m.channels.includes(message.channel?.parentId || "")
                ) {
                    multipliers.push(m.multiplier);
                }
                if (!is.array(m.roles) && !is.array(m.channels)) {
                    multipliers.push(m.multiplier);
                }
            }
        }
        const multi = Math.max(...multipliers);
        if (multi > 0) {
            xp *= multi;
        }
        if (db.toggles.weekly.track === true) {
            // @ts-ignore
            await this.weekly.add(message.guildId, {
                stats: { messages: 1 },
                users: [{ messages: 1, userId: author.id }],
            });
        }
        // @ts-ignore
        let user = await this.getUser(author.id, message.guildId);
        if (!user || user.toggles.locked === true) {
            return;
        }
        user.stats = incUserStat(user, "messages");
        user = await user.save().catch(() => null);
        if (!user) {
            return;
        }
        const find = user.cooldowns.find((c) => c.name === "xp");
        let cool = getMinutes(db.cooldown);
        if (is.array(db.cooldowns)) {
            const hasCustom = db.cooldowns.find((c) =>
                (member as GuildMember).roles.cache.hasAny(...c.roles),
            );
            if (hasCustom) {
                cool = getMinutes(hasCustom.seconds);
            }
        }
        if (find) {
            const time = Date.now() - find.date;
            if (time < cool) {
                this.#events.emit("cooldown", message, find);
                return;
            }
            find.cooldown = cool;
            find.date = Date.now() + cool;
        } else {
            user.cooldowns.push({
                name: "xp",
                date: Date.now() + cool,
                cooldown: cool,
            });
        }
        user = await user.save().catch(() => null);
        if (!user) {
            return;
        }
        if (
            is.array(db.ignore.channels) &&
            db.ignore.channels.some((c) =>
                [message.channelId, message.channel?.parentId].includes(c),
            )
        ) {
            return; // Ignore the user / XP earned in this channel.
        }
        if (is.array(db.ignore.users) && db.ignore.users.includes(author.id)) {
            return; // Ignore if the user is ignored.
        }
        if (
            is.array(db.ignore.roles) &&
            member.roles.cache.hasAny(...db.ignore.roles)
        ) {
            return; // Ignore if the user has any of the ignore roles.
        }
        return this.handleLevelups(member, message.channel, xp, db);
    }

    /**
     * This is only for internal use!
     *
     */
    private async handleLevelups(
        member: GuildMember,
        currentChannel: TextBasedChannel | null,
        xp: number,
        db?: CachedOptions<Settings> | null,
        voiceMinutes?: number,
        isLevelup?: boolean | null,
    ) {
        if (!db) {
            // @ts-ignore
            db = await this.getSettings(member.guild.id);
        }
        if (!db || !db.enabled) {
            return null;
        }
        let roles = [...member.roles.cache.keys()];
        let level: boolean | null = false;
        if (is.boolean(isLevelup)) {
            level = isLevelup;
        } else {
            level = await this.api.users.appendXP(
                member.id,
                member.guild.id,
                xp,
                voiceMinutes,
                true,
            );
        }
        const profile = await this.api.users.get(member.id, member.guild.id);
        if (!profile.status) {
            return;
        }
        const find = db.levels.find((c) => c.level === profile.data.level);
        const allLevelRoles = db.levels
            .filter((c) => c.roles.add.length)
            .flatMap((c) => c.roles.add);
        const str = async <D extends Record<string, unknown>>(data: D) => {
            return await parser(
                data,
                {
                    level: `${profile.data.level}`,
                    xp: `${profile.data.xp}`,
                    background: profile.data.background,
                },
                { member, guild: member.guild, user: member.user },
            );
        };
        const getOptions = async (options: {
            content: string;
            embeds: APIEmbed[];
        }) => {
            if (!options.content && !options.embeds?.length) {
                options.content = `Congrats ${p.user.mention}, you leveled up to **Level ${profile.data.level}**!`;
            }
            return await str(options);
        };
        if (level === true) {
            this.#events.emit("xp", member, profile.data, db.toJSON(), xp);
            this.#events.emit(
                "level",
                member,
                profile.data,
                db.toJSON(),
                profile.data.level,
            );
            if (db.toggles.weekly.track) {
                // @ts-ignore
                await this.weekly.add(member.guild.id, {
                    stats: { xp },
                    users: [{ level: 1, userId: member.id, xp }],
                });
            }
            if (find) {
                if (member.guild.members.me?.permissions.has(268435456n)) {
                    roles = roles.filter((c) => !find.roles.remove.includes(c));
                    if (!db.toggles.stackRoles) {
                        roles = roles.filter((c) => !allLevelRoles.includes(c));
                    }
                    roles.push(...find.roles.add);
                    await member.edit({ roles }).catch(() => null);
                }
            }
            if (db.toggles.onlyRegisteredLevels === true && !find) {
                return;
            }
            if (cached.has(`${profile.data.level}:${member.id}`)) {
                return;
            }
            cached.add(`${profile.data.level}:${member.id}`);
            if (db.announce.channel.enabled) {
                const channel =
                    member.guild.channels.resolve(
                        db.announce.channel.channel,
                    ) || currentChannel;
                if (channel && "send" in channel) {
                    const users = [member.id];
                    if (
                        !db.announce.channel.ping ||
                        !profile.data.toggles.pings
                    ) {
                        users.length = 0;
                    }
                    await channel
                        .send({
                            ...(await getOptions(db.announce.channel.options)),
                            allowedMentions: {
                                users,
                            },
                        })
                        .catch(() => null);
                }
            }
            if (db.announce.dm.enabled && profile.data.toggles.dms === true) {
                await member
                    .send({
                        ...(await getOptions(db.announce.dm.options)),
                        components: [
                            {
                                type: 1,
                                components: [
                                    {
                                        type: 2,
                                        style: 2,
                                        label: `From: ${member.guild.name}`,
                                        custom_id: "...",
                                        disabled: true,
                                    },
                                ],
                            },
                        ],
                        allowedMentions:
                            profile.data.toggles.pings === true
                                ? {
                                      parse: [],
                                  }
                                : undefined,
                    })
                    .catch(() => null);
            }
        } else {
            this.#events.emit("xp", member, profile.data, db.toJSON(), xp);
            if (db.toggles.weekly.track) {
                // @ts-ignore
                await this.weekly.add(member.guild.id, {
                    stats: { xp },
                    users: [{ userId: member.id, xp }],
                });
            }
        }
    }
}
