import { discord, error, get, hasBit, is, p } from "@elara-services/utils";
import { GuildWebhook, sendOptions } from "@elara-services/webhooks";
import {
    Client,
    Message,
    TextBasedChannel,
    VoiceState,
    type Guild,
    type GuildChannel,
    type GuildMember,
    type MessageCreateOptions,
    type PartialGuildMember,
} from "discord.js";
import { EventEmitter } from "events";
import type {
    CachedOptions,
    Options,
    Settings,
    UserCache,
    Users,
} from "./interfaces";
import { Database } from "./services";
import { API } from "./services/api";
import {
    getClientIntents,
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

    private webhook(guild: Guild) {
        return new GuildWebhook(guild);
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
            channel: GuildChannel | null,
        ) => unknown,
    ) {
        return this.#events.on("level", listener);
    }

    private async send(
        db: Settings,
        channel: TextBasedChannel,
        channelId: string,
        options: sendOptions,
    ) {
        if (channel.isDMBased()) {
            return;
        }
        if (!channel.isTextBased() || !channel.guild) {
            return;
        }
        if (
            db.toggles.useWebhook &&
            channel.permissionsFor(channel.client.user.id)?.has(536870912n)
        ) {
            options.webhook = {
                name: db.webhook.name || channel.client.user.displayName,
                icon:
                    db.webhook.image ||
                    channel.client.user.displayAvatarURL({
                        forceStatic: true,
                        extension: "png",
                    }),
            };
            return this.webhook(channel.guild)
                .send(channelId, options as sendOptions, false, false)
                .catch(error);
        }
        return channel.send(options as MessageCreateOptions).catch(error);
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
            this.client.on("messageCreate", (m) => void this.messageCreate(m));
        }
        if (hasBit(intents, 2 /* Guild Members */)) {
            this.client.on(
                "guildMemberRemove",
                (m) => void this.guildMemberRemove(m),
            );
        }
        if (hasBit(intents, 128 /* Guild Voice States */)) {
            this.client.on(
                "voiceStateUpdate",
                (o, n) => void this.voiceStateUpdate(o, n),
            );
        }
    }

    public async voiceStateUpdate(old: VoiceState, voice: VoiceState) {
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
                    // @ts-ignore
                    db,
                    voiceMinutes,
                );
            }
            user.voice.duration = 0;
            user.voice.multiplier = 0;
        }
        await user.save().catch(() => null);
    }

    public async guildMemberRemove(m: GuildMember | PartialGuildMember) {
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

    public async messageCreate(message: Message) {
        if (!message.inGuild() || !message.guild.available) {
            return;
        }
        let member = message.member;
        let author = message.author;
        // @ts-ignore
        const db = await this.getSettings(message.guildId);
        if (!db || !db.enabled) {
            return;
        }
        if (author.bot) {
            if (!message.interaction) {
                return;
            }
            if (!db.toggles.earnXPOnSlashCommands) {
                return;
            }
            author = message.interaction.user;
            member = await discord.member(message.guild, author.id, true);
        }
        if (!member) {
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
            member?.roles.cache.hasAny(...db.ignore.roles)
        ) {
            return; // Ignore if the user has any of the ignore roles.
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
        // @ts-ignore
        let user = await this.getUser(author.id, message.guildId);
        if (!user || user.toggles.locked === true) {
            return;
        }
        if (db.toggles.weekly.track === true) {
            // @ts-ignore
            await this.weekly.add(message.guildId, {
                stats: { messages: 1 },
                users: [{ messages: 1, userId: author.id }],
            });
        }
        // @ts-ignore
        user.stats = incUserStat(user, "messages");
        const find = user.cooldowns.find((c) => c.name === "xp");
        let cool = get.secs(db.cooldown || 60);
        if (is.array(db.cooldowns)) {
            const hasCustom = db.cooldowns.find(
                (c) => member?.roles.cache.hasAny(...c.roles),
            );
            if (hasCustom) {
                cool = get.secs(hasCustom.seconds || 60);
            }
        }
        if (find) {
            const time = Date.now() - find.date;
            if (time < cool) {
                this.#events.emit("cooldown", message, find);
                await user.save().catch(() => null);
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
        // @ts-ignore
        return this.handleLevelups(member, message.channel, xp, db);
    }

    public async sendOptions(
        user: Users,
        db: Settings,
        member: GuildMember,
        options: Options,
        channel: TextBasedChannel,
    ) {
        const r = await this.getOptions(options, user, member);
        if (!r) {
            return;
        }
        const users = [member.id];
        if (!db.announce.channel.ping || !user.toggles.pings) {
            users.length = 0;
        }
        return this.send(db, channel, channel.id, {
            ...r,
            // @ts-ignore
            allowedMentions: { users },
            allowed_mentions: { users },
        });
    }

    public async getOptions(
        options: Options,
        user: Users,
        member: GuildMember,
    ) {
        if (!options.content && !options.embeds?.length) {
            options.content = `Congrats ${p.user.mention}, you leveled up to **Level ${user.level}**!`;
        }
        return await parser(
            options,
            {
                level: `${user.level}`,
                xp: `${user.xp}`,
                background: user.background,
            },
            { member, guild: member.guild, user: member.user },
        );
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
        let find: Settings["levels"][0] | undefined;

        if (is.array(db.levels)) {
            for (const level of db.levels.sort((a, b) => b.level - a.level)) {
                if (profile.data.level === level.level) {
                    find = level;
                    break;
                }
                if (profile.data.level >= level.level) {
                    find = level;
                    break;
                }
            }
        }
        const allLevelRoles = db.levels
            .filter((c) => c.roles.add.length)
            .flatMap((c) => c.roles.add);
        if (level === true) {
            const channel =
                member.guild.channels.resolve(db.announce.channel.channel) ||
                currentChannel;
            this.#events.emit("xp", member, profile.data, db.toJSON(), xp);
            this.#events.emit(
                "level",
                member,
                profile.data,
                db.toJSON(),
                profile.data.level,
                channel,
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
                    roles = roles.filter(
                        (c) => !find?.roles.remove.includes(c),
                    );
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
                if (channel && "send" in channel) {
                    await this.sendOptions(
                        profile.data,
                        db,
                        member,
                        db.announce.channel.options,
                        channel,
                    );
                }
            }
            if (db.announce.dm.enabled && profile.data.toggles.dms === true) {
                await member
                    .send({
                        ...(await this.getOptions(
                            db.announce.dm.options,
                            profile.data,
                            member,
                        )),
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
