import { is, p } from "@elara-services/utils";
import {
    APIEmbed,
    Client,
    Events as DEvents,
    IntentsBitField,
    Message,
    PermissionFlagsBits,
    TextBasedChannel,
    VoiceState,
    type GuildMember,
    type PartialGuildMember,
} from "discord.js";
import { EventEmitter } from "events";
import type { CachedOptions, Settings, UserCache, Users } from "./interfaces";
import { Database } from "./services";
import { API } from "./services/api";
import { getVoiceMultiplier, incUserStat, parser, random } from "./utils";
export type * from "./interfaces";
export type * from "./services";
export type * from "./services/api";
export * from "./utils";

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
    /**
     * Internal cache for user cooldowns
     */
    #cache = new Map<string, UserCache>();
    public constructor(public client: Client, mongodbURI: string) {
        super(mongodbURI, client);
    }

    /**
     * Emits when the cooldown is added for the user
     */
    public onCooldown(
        listener: (message: Message<true>, cooldown: UserCache) => unknown
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
            server: Settings & { _id: string }
        ) => unknown
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
            server: Settings & { _id: string }
        ) => unknown
    ) {
        return this.#events.on("xp", listener);
    }

    public get cache() {
        return {
            clear: {
                /**
                 * Delete a user from a server's cooldown.
                 */
                user: (userId: string, guildId: string) =>
                    this.#cache.delete(`${userId}-${guildId}`),
                /**
                 * Delete all users from a server's cooldown
                 */
                server: (guildId: string) =>
                    [...this.#cache.values()].map((c) =>
                        c.search.includes(guildId)
                            ? this.#cache.delete(c.search)
                            : false
                    ),
            },
        };
    }

    /**
     * Use this to start listening for events and automatically handle xp/leveling
     */
    async start() {
        if (this.#listening) {
            return true;
        }
        this.#listening = true;
        if (
            this.client.options.intents.has(IntentsBitField.Flags.GuildMessages)
        ) {
            this.client.on(
                DEvents.MessageCreate,
                (m) => void this.#messageCreate(m)
            );
        }
        if (
            this.client.options.intents.has(IntentsBitField.Flags.GuildMembers)
        ) {
            this.client.on(DEvents.GuildMemberRemove, (m) =>
                this.#guildMemberRemove(m)
            );
        }
        if (
            this.client.options.intents.has(
                IntentsBitField.Flags.GuildVoiceStates
            )
        ) {
            this.client.on(DEvents.VoiceStateUpdate, (o, n) =>
                this.#voiceStateUpdate(o, n)
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
        const db = await this.getSettings(voice.guild.id);
        if (!db || !db.enabled || !db.toggles.voice) {
            return;
        }
        if (
            is.array(db.ignore.channels) &&
            db.ignore.channels.some((c) =>
                [voice.channelId, voice.channel?.parentId].includes(c)
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
        const user = await this.getUser(voice.member.user.id, voice.guild.id);
        if (!user || user.toggles.locked) {
            return;
        }

        const now = Date.now();
        let [voiceDuration, voiceMinutes] = [0, 0];
        if (user.voice.duration) {
            voiceMinutes = parseInt(
                ((now - user.voice.duration) / 60000).toFixed(0)
            );
            voiceDuration = parseInt(
                ((now - user.voice.duration) / 1000).toFixed(0)
            );
        }
        const xpToGive = Math.floor(
            Math.min(
                voiceDuration * user.voice.multiplier,
                20 * 25 * 3 * user.voice.multiplier
            )
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
                await this.weekly.add(voice.member.guild.id, {
                    stats: { voice: voiceMinutes },
                    users: [{ userId: voice.member.id, voice: voiceMinutes }],
                });
            }
            if (is.number(xpToGive)) {
                await this.#handleLevelups(
                    voice.member,
                    voice.channel ?? old.channel,
                    xpToGive,
                    db,
                    voiceMinutes
                );
            }
            user.voice.duration = 0;
            user.voice.multiplier = 0;
        }
        await user.save().catch(() => null);
    }

    async #guildMemberRemove(m: GuildMember | PartialGuildMember) {
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
        if (
            !message.inGuild() ||
            message.author.bot ||
            !message.guild.available
        ) {
            return;
        }
        const member = message.member;
        if (!member) {
            return;
        }
        const db = await this.getSettings(message.guildId);
        if (!db || !db.enabled) {
            return;
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
                    m.channels.includes(message.channel.parentId || "")
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
            await this.weekly.add(message.guildId, {
                stats: { messages: 1 },
                users: [{ messages: 1, userId: message.author.id }],
            });
        }
        let user = await this.getUser(message.author.id, message.guildId);
        if (!user || user.toggles.locked === true) {
            return;
        }
        user.stats = incUserStat(user, "messages");
        user = await user.save().catch(() => null);
        if (!user) {
            return;
        }
        const search = `${message.author.id}-${message.guildId}`;
        const cooldown = this.#cache.get(search);
        if (cooldown) {
            const time = Date.now() - cooldown.date;
            if (time < cooldown.cooldown) {
                this.#events.emit("cooldown", message, cooldown);
                return;
            }
            this.#cache.delete(search);
        }
        this.#cache.set(search, {
            date: Date.now() + (db.cooldown || 60) * 1000,
            cooldown: (db.cooldown || 60) * 1000,
            search,
        });
        if (
            is.array(db.ignore.channels) &&
            db.ignore.channels.some((c) =>
                [message.channelId, message.channel.parentId].includes(c)
            )
        ) {
            return; // Ignore the user / XP earned in this channel.
        }
        if (
            is.array(db.ignore.users) &&
            db.ignore.users.includes(message.author.id)
        ) {
            return; // Ignore if the user is ignored.
        }
        if (
            is.array(db.ignore.roles) &&
            member.roles.cache.hasAny(...db.ignore.roles)
        ) {
            return; // Ignore if the user has any of the ignore roles.
        }
        return this.#handleLevelups(message.member, message.channel, xp, db);
    }

    async #handleLevelups(
        member: GuildMember,
        currentChannel: TextBasedChannel | null,
        xp: number,
        db: CachedOptions<Settings>,
        voiceMinutes?: number
    ) {
        let roles = [...member.roles.cache.keys()];
        const level = await this.api.users.appendXP(
            member.id,
            member.guild.id,
            xp,
            voiceMinutes
        );
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
                { member, guild: member.guild, user: member.user }
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
            this.#events.emit("xp", member, profile.data, db.toJSON());
            this.#events.emit("level", member, profile.data, db.toJSON());
            if (db.toggles.weekly.track) {
                await this.weekly.add(member.guild.id, {
                    stats: { xp },
                    users: [{ level: 1, userId: member.id, xp }],
                });
            }
            if (find) {
                if (
                    member.guild.members.me?.permissions.has(
                        PermissionFlagsBits.ManageRoles
                    )
                ) {
                    roles = roles.filter((c) => !find.roles.remove.includes(c));
                    if (!db.toggles.stackRoles) {
                        roles = roles.filter((c) => !allLevelRoles.includes(c));
                    }
                    roles.push(...find.roles.add);
                    await member
                        .edit({
                            roles,
                            reason: `[AUTOMATIC]: Level up!`,
                        })
                        .catch(() => null);
                }
            }
            if (db.toggles.onlyRegisteredLevels === true && !find) {
                return;
            }
            if (db.announce.channel.enabled) {
                const channel =
                    member.guild.channels.resolve(
                        db.announce.channel.channel
                    ) || currentChannel;
                if (channel?.isTextBased()) {
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
            this.#events.emit("xp", member, profile.data, db.toJSON());
            if (db.toggles.weekly.track) {
                await this.weekly.add(member.guild.id, {
                    stats: { xp },
                    users: [{ userId: member.id, xp }],
                });
            }
        }
    }
}
