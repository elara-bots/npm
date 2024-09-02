import { Collection } from "@discordjs/collection";
import { REST, makeURLSearchParams } from "@discordjs/rest";
import { DiscordSnowflake } from "@sapphire/snowflake";
import { Routes, type APIMessage } from "discord-api-types/v10";
import {
    ActionRowBuilder,
    Application,
    ButtonBuilder,
    ButtonStyle,
    CategoryChannel,
    Channel,
    Client,
    Colors,
    EmbedBuilder,
    ForumChannel,
    Guild,
    GuildMember,
    InteractionEditReplyOptions,
    Invite,
    Message,
    MessageActionRowComponentBuilder,
    MessageCreateOptions,
    MessagePayload,
    RepliableInteraction,
    Role,
    TextBasedChannel,
    TextChannel,
    ThreadChannel,
    User,
    VoiceChannel,
    version,
    type ButtonInteraction,
    type ChannelSelectMenuInteraction,
    type ComponentEmojiResolvable,
    type FetchChannelOptions,
    type GuildBan,
    type Interaction,
    type MentionableSelectMenuInteraction,
    type PermissionResolvable,
    type RoleSelectMenuInteraction,
    type StringSelectMenuInteraction,
    type UserSelectMenuInteraction,
} from "discord.js";
import { chunk, colors, shuffle, sleep } from "./extra";
import { is } from "./is";
import { XOR } from "./jobs";
import { checkChannelPerms } from "./permissions";
import { comment } from "./responders";
import { get, status } from "./status";
import { log, time } from "./times";
import { field, snowflakes } from "./utils";
export type errorHandler = (e: Error) => unknown;

export function isV13() {
    return version.startsWith("13.");
}

export function createREST(client: string | REST | Client) {
    if (client instanceof Client) {
        if (client.rest instanceof REST) {
            return client.rest;
        }
        client = client.token as string;
    }
    return is.string(client) ? new REST().setToken(client) : client;
}

export function canTakeActionAgainstMember(mod: GuildMember, member: GuildMember, permissions: PermissionResolvable[]) {
    if (!(member instanceof GuildMember) || !(mod instanceof GuildMember) || !is.array(permissions) || !member.guild.members.me || [member.guild.ownerId, member.client.user.id].includes(member.id)) {
        return false;
    }
    if (member.guild.members.me.roles.highest.comparePositionTo(member.roles.highest) < 0) {
        return false;
    }
    if (mod.roles.highest.comparePositionTo(member.roles.highest) < 0) {
        return false;
    }
    if (permissions.some((c) => member.permissions.has(c))) {
        return false;
    }
    return true;
}

export async function fetchMessages(botTokenOrREST: string | REST, channelId: string, limit = 50, before?: string, after?: string) {
    const rest = createREST(botTokenOrREST);
    const getMessages = async (limit = 100, _before?: string | boolean, _after?: string) => {
        return (await rest
            .get(Routes.channelMessages(channelId), {
                query: makeURLSearchParams({ limit, before: _before || undefined, after: _after || undefined }),
            })
            .catch(() => [])) as APIMessage[];
    };
    if (limit && limit > 100) {
        let logs: APIMessage[] = [];
        const get = async (_before?: string | boolean, _after?: string): Promise<APIMessage[]> => {
            const messages = await getMessages(100, _before || undefined, _after || undefined);
            if (limit <= messages.length) {
                return _after
                    ? messages
                          .slice(messages.length - limit, messages.length)
                          .map((message) => message)
                          .concat(logs)
                    : logs.concat(messages.slice(0, limit).map((message) => message));
            }
            limit -= messages.length;
            logs = _after ? messages.map((message) => message).concat(logs) : logs.concat(messages.map((message) => message));
            if (messages.length < 100) {
                return logs;
            }
            return get((_before || !_after) && messages[messages.length - 1].id, _after && messages[0].id);
        };
        return get(before, after);
    }
    return await getMessages(limit, before, after);
}

export async function fetchAllGuildBans(
    guild: Guild,
    options: {
        after?: string;
        before?: string;
        limit?: number;
    },
) {
    const bans = [
        ...(
            await guild.bans
                .fetch({
                    after: options.after,
                    before: options.before,
                    limit: options.limit && Math.min(options.limit, 1000),
                })
                .catch(() => new Collection())
        ).values(),
    ] as GuildBan[];

    if (options.limit && options.limit > 1000 && bans.length >= 1000) {
        const page = await fetchAllGuildBans(guild, {
            after: options.before ? undefined : bans[bans.length - 1].user.id,
            before: options.before ? bans[0].user.id : undefined,
            limit: options.limit - bans.length,
        });
        bans[options.before ? "unshift" : "push"](...page);
    }

    return bans;
}

export const discord = {
    user: async (
        client: Client,
        args: string,
        { force, fetch, mock }: DiscordUserOptions = {
            fetch: true,
            force: false,
            mock: false,
        },
    ): Promise<User | null> => {
        if (!client || !client.isReady() || !args) {
            return null;
        }
        if (!is.boolean(force)) {
            force = false;
        }
        if (!is.boolean(fetch)) {
            fetch = true;
        }
        if (!is.boolean(mock)) {
            mock = false;
        }
        const matches = args.match(/^(?:<@!?)?([0-9]+)>?$/);
        if (!matches) {
            return client.users.cache.find((c) => c.tag.toLowerCase().includes(args.toLowerCase())) ?? null;
        }
        const getMock = () => {
            if (mock) {
                // @ts-ignore
                return new User(client, {
                    username: "Unknown User",
                    discriminator: "0000",
                    id: matches[1],
                });
            }
            return null;
        };
        if (client.users.cache.has(matches[1])) {
            if (force) {
                return client.users.fetch(matches[1], { cache: true, force: true }).catch(() => getMock());
            }
            return client.users.resolve(matches[1]);
        }
        if (!fetch && !mock && !force) {
            return null;
        }
        if (fetch) {
            return client.users.fetch(matches[1], { cache: true, force: true }).catch(() => getMock());
        }
        return getMock();
    },
    role: async (guild: Guild, id: string): Promise<Role | null> => {
        if (!guild?.roles || !is.string(id)) {
            return null;
        }
        const matches = id.match(/^(?:<@&?)?([0-9]+)>?$/);
        if (!matches) {
            return guild.roles.cache.find((c) => c.name.toLowerCase() === id.toLowerCase() || c.name.toLowerCase().includes(id.toLowerCase())) || null;
        }
        return guild.roles.fetch(matches[1], { cache: true }).catch(() => null);
    },
    channel: async <D extends Channel>(client: Client, id: string, guildToSearch: Guild | null = null, options?: FetchChannelOptions): Promise<D | null> => {
        if (!client || !is.string(id)) {
            return null;
        }
        const hm = id.match(/^(?:<#?)?([0-9]+)>?$/);
        if (!hm) {
            if (guildToSearch) {
                const find = guildToSearch?.channels?.cache?.find?.((c) => c.name.includes(id));
                if (find) {
                    return find as D;
                }
            }
            return null;
        }
        if (client.channels.cache.has(hm[1])) {
            return client.channels.resolve(hm[1]) as D;
        }
        const c = await client.channels.fetch(hm[1], options).catch(() => null);
        if (!c) {
            return null;
        }
        return c as D;
    },
    member: async (guild: Guild, args: string, fetch = false, withPresences = true): Promise<GuildMember | null> => {
        if (!guild || !is.string(args)) {
            return null;
        }
        const matches = args.match(/^(?:<@!?)?([0-9]+)>?$/);
        if (!matches) {
            return guild.members.cache.find((c) => c.user.tag.toLowerCase().includes(args.toLowerCase())) ?? null;
        }
        let m: GuildMember | null = guild.members.resolve(matches[1]);
        if (!m) {
            if (fetch) {
                m = await guild.members
                    .fetch({
                        user: matches[1],
                        withPresences,
                    })
                    .catch(() => null);
                if (m instanceof Collection) {
                    return m.first() ?? null;
                } else if (m) {
                    return m ?? null;
                }
            }
            if (!m) {
                return null;
            }
        }
        return m;
    },
    messages: {
        send: async (
            {
                client,
                channelId,
                options,
            }: {
                client: Client<true>;
                channelId: string;
                options: string | MessagePayload | MessageCreateOptions;
            },
            errorHandler: errorHandler = () => {},
        ): Promise<Message<true> | Message<false> | null> => {
            const isFunc = typeof errorHandler === "function";
            const channel = await discord.channel(client, channelId);
            if (!channel || !("send" in channel)) {
                if (isFunc) {
                    errorHandler(new Error(`[WARN] Failed to send message to channel: <#${channelId}> (${channelId})`));
                }
                return null;
            }
            return await channel.send(options).catch((e) => {
                if (isFunc) {
                    errorHandler(e);
                }
                return null;
            });
        },
        fetch: async (
            {
                client,
                channelId,
                messageId,
            }: {
                client: Client<true>;
                channelId: string;
                messageId: string;
            },
            errorHandler: errorHandler = () => {},
        ): Promise<Message | null> => {
            const channel = await discord.channel(client, channelId);
            if (!channel || !("messages" in channel)) {
                return null;
            }
            return await channel.messages.fetch(messageId).catch((e) => {
                errorHandler(e);
                return null;
            });
        },
        /**
         * @description Fetch messages in the channelId provided.
         * @note If the 'limit' is above 100, the bot will continue to fetch messages until the limit provided. (it will stop once there is no more messages to fetch in the channel)
         * @note Be careful with going above 100 limit, the bot will chunk the requests per-100 messages, meaning if you fetch 1000 messages, that's 10 requests the bot has to do)
         * @note The bot will follow the ratelimits Discord provides, so if you provide a large limit it will take longer for the function to return anything. (Example: 10k messages takes around ~2 minutes to complete)
         */
        fetchBulk: async (client: Client, channelId: string, limit = 50): Promise<Message[] | null> => {
            const messages = await fetchMessages(client.rest instanceof REST ? client.rest : (client.token as string), channelId, limit);
            if (!is.array(messages)) {
                return null;
            }
            // @ts-ignore
            return messages.map((c) => new Message(client, c));
        },
        delete: async (clientOrToken: Client | string, channelId: string, messageId: string) => {
            if (!channelId || !messageId) {
                throw new Error(`You didn't provide a channelId or a messageId`);
            }
            const rest = createREST(clientOrToken);
            return await rest.delete(Routes.channelMessage(channelId, messageId));
        },

        /**
         * @description Bulk delete messages in a channel.
         * @note ignore.errors will ignore all errors while trying to bulkDelete, the 'errors' array sent will be empty.
         * @note ignore.old will remove message IDs before trying to bulkDelete, the returned 'old' field will provide the message IDs that is older than 2 weeks.
         */
        bulkDelete: async (clientOrToken: Client | string, channelId: string, messages: string[], ignore: { errors?: boolean; old?: boolean } = { errors: true, old: true }) => {
            const old = messages.filter((c) => Date.now() - DiscordSnowflake.timestampFrom(c) > 1_209_600_000);
            if (ignore?.old === true) {
                messages = messages.filter((c) => !old.includes(c));
            }
            if (messages.length < 2) {
                throw new Error(`Min messages to delete is 2, you provided ${messages.length}`);
            }

            const rest = createREST(clientOrToken);
            const success: string[] = [];
            const errors: { messages: string[]; error: Error }[] = [];
            const del = async (c: string[] = []) => {
                const r = await rest
                    .post(Routes.channelBulkDelete(channelId), {
                        body: { messages: c },
                    })
                    .catch((e) => {
                        if (ignore?.errors === true) {
                            return null;
                        }
                        errors.push({ messages: c, error: new Error(e || "Unknown Error while trying to bulkDelete") });
                        return null;
                    });
                if (r) {
                    success.push(...c);
                }
                return true;
            };
            if (messages.length > 100) {
                const chunked = chunk(messages, 100);
                await Promise.all(chunked.map((c) => del(c)));
            } else {
                await del(messages);
            }
            return { success, errors, old };
        },
    },
};

export interface DiscordUserOptions {
    mock?: boolean;
    fetch?: boolean;
    force?: boolean;
}

export function setMobileStatusIcon(deviceType: "iOS" | "Android" = "iOS") {
    // @ts-ignore
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require("@discordjs/ws").DefaultWebSocketManagerOptions.identifyProperties.browser = `Discord ${deviceType}`;
}

export function lazyField(embed: EmbedBuilder, name = "\u200b", value = "\u200b", inline = false) {
    if ("addFields" in embed) {
        return embed.addFields(field(name, value, inline));
    }
    return field(name, value, inline);
}

export async function deleteMessage(message: Message, timeout = 5000) {
    if (timeout <= 0) {
        return message.delete().catch(() => null);
    }
    return sleep(timeout).then(() => message.delete().catch(() => null));
}

export async function react(message: Message, emojis: string[] | string) {
    if (!checkChannelPerms(message.channel, message.client.user.id, 347200n)) {
        return null;
    }
    if (is.array(emojis)) {
        for (const e of emojis.reverse()) {
            message.react(e).catch(() => null);
        }
        return true;
    }
    if (is.string(emojis)) {
        return message
            .react(emojis)
            .then(() => true)
            .catch(() => false);
    }
    return false;
}

export type InviteResponseData<D> = { status: false; message: string } | { status: true; data: D };
export interface MakeInviteClientOptions {
    search: object;
    fetch?: {
        inviters?: boolean;
        uses?: boolean;
        inviter_ids?: string[];
    };
}

export interface FormatInvitedBy {
    // Total number of people invited by the user.
    invited: number;
    // Total uses for all invites that the user has.
    uses: number;
    codes: {
        type: Exclude<FetchedMemberInvite["joinType"], "bot" | "integration">;
        code: string;
        uses: number;
    }[];
    members: FetchedMemberInvite[];
}

export const Invites = {
    cache: new Collection<string, string[]>(),
    compare: (c: string[], s: string[]) => {
        for (let i = 0; i < c.length; i++) {
            if (c[i] !== s[i]) {
                return c[i];
            }
        }
        return "";
    },

    used: async (guild: Guild) => {
        if (!guild?.members?.me?.permissions?.has?.(48n)) {
            return null;
        }
        const f = (i: any) => `${i.code}|${i.uses ? i.uses : "♾"}|${i.inviter?.id ?? "None"}`;
        const Cached = (invs: Collection<string, Invite>) => {
            Invites.cache.set(guild.id, invs.map(f));
            return null;
        };
        const invites = await guild.invites.fetch().catch(() => null);
        if (!invites) {
            return null;
        }
        const CachedInvites = Invites.cache.get(guild.id);
        const currentInvites = invites.map(f);
        if (!CachedInvites?.length) {
            return Cached(invites);
        }
        if (CachedInvites.join(" ") === currentInvites.join(" ")) {
            if (guild.features.includes("VANITY_URL") && guild.vanityURLCode) {
                const owner = guild.members.resolve(guild.ownerId) || (await guild.members.fetch({ user: guild.ownerId }).catch(() => null)) || null;
                return {
                    code: guild.vanityURLCode,
                    uses: `♾`,
                    inviter: owner?.user ?? "[UNKNOWN_USER]",
                };
            }
            if (invites.size) {
                Cached(invites);
            }
            return null;
        } else {
            const used = Invites.compare(currentInvites, CachedInvites);
            if (!is.string(used)) {
                return Cached(invites);
            }
            const [code, uses, inviter] = used.split("|");
            Cached(invites);
            return {
                code,
                uses: uses === "Infinite" ? "♾" : uses,
                inviter: await discord.user(guild.client, inviter, { fetch: true, mock: true }),
            };
        }
    },

    /**
     * [WARNING]:
     * - This uses an endpoint not documented and can be restricted to bots at any time by Discord.
     * - Due to caching on Discord's end an entry for a user might not show up for a few minutes to an hour+ (THIS CAN'T BE CHANGED)
     */
    query: async (guild: Guild, options: MakeInviteClientOptions, guildInvites?: Collection<string, Invite>): Promise<InviteResponseData<FetchedMemberInvitesResponse>> => {
        return new Promise(async (r) => {
            if (!guild.features.includes("COMMUNITY")) {
                return r(status.error(`Server ${guild.name} (${guild.id}) doesn't have "COMMUNITY" enabled so this cannot be used.`));
            }
            let fetchInviters = true;
            let fetchUses = true;
            if (is.object(options.fetch)) {
                if (is.boolean(options.fetch.inviters)) {
                    fetchInviters = options.fetch.inviters;
                }
                if (is.boolean(options.fetch.uses)) {
                    fetchUses = options.fetch.uses;
                }
            }
            let data: FetchedMemberInvitesResponse | Error = new Error(`Unable to fetch the members invites.`);
            const fetch = async () => {
                if (isV13()) {
                    // @ts-ignore
                    data = (await guild.client.api
                        // @ts-ignore
                        .guilds(guild.id)("members-search")
                        .post({ data: options.search })
                        // @ts-ignore
                        .catch((e: Error) => e)) as FetchedMemberInvitesResponse | Error;
                } else {
                    data = (await guild.client.rest.post(`/guilds/${guild.id}/members-search`, { body: options.search }).catch((e: Error) => e)) as FetchedMemberInvitesResponse | Error;
                }
            };
            await fetch();
            if ("retry_after" in data) {
                await sleep((data.retry_after as number) * 1000);
                await fetch();
            }
            // @ts-ignore
            if (data instanceof Error || !is.array(data?.members || [])) {
                // @ts-ignore
                return r(status.error(data?.message || is.array(data?.members || [], false) ? "No users/invites returned by Discord" : "Unknown Issue while fetching it."));
            }
            // @ts-ignore
            data.members = data.members.map((c: FetchedMemberInvitesResponse["members"][0]) => {
                const types = {
                    1: "bot",
                    2: "integration",
                    3: "server_discovery",
                    5: "normal",
                    6: "vanity",
                };
                // @ts-ignore
                c.joinType = types[c.join_source_type as keyof typeof types] || "unknown";
                return c;
            });
            if (is.array(options.fetch?.inviter_ids)) {
                // @ts-ignore
                data.members = data.members.filter((c) => {
                    if (!c.inviter_id || !options.fetch?.inviter_ids?.includes?.(c.inviter_id)) {
                        return false;
                    }
                    return true;
                });
            }
            if (fetchUses === true && guild.members.me?.permissions.has(32n)) {
                const invs = guildInvites ?? (await guild.invites.fetch({ cache: false }).catch(() => null));
                if (invs?.size) {
                    // @ts-ignore
                    data.members = data.members.map((c) => {
                        if ("source_invite_code" in c && c.source_invite_code) {
                            const d = invs.find((i) => i.code === c.source_invite_code);
                            c.uses = d?.uses || 0;
                            c.notFound = d ? false : true;
                        } else {
                            c.uses = 0;
                            c.notFound = false;
                        }
                        return c;
                    });
                } else {
                    // @ts-ignore
                    data.members = data.members.map((c) => {
                        c.uses = 0;
                        c.notFound = true;
                        return c;
                    });
                }
            } else {
                // @ts-ignore
                data.members = data.members.map((c) => {
                    c.uses = 0;
                    c.notFound = false;
                    return c;
                });
            }
            if (fetchInviters === true) {
                // @ts-ignore
                data.members = await Promise.all(
                    // @ts-ignore
                    data.members.map(async (c) => {
                        if (c.join_source_type === 6) {
                            c.inviter = await discord.user(guild.client, guild.ownerId, { fetch: true });
                        } else if (
                            c.inviter_id &&
                            [
                                1, // Bot Invite
                                5, // Normal invite.
                            ].includes(c.join_source_type)
                        ) {
                            c.inviter = await discord.user(guild.client, c.inviter_id, { fetch: true });
                        } else {
                            c.inviter = null;
                        }
                        return c;
                    }),
                );
            } else {
                // @ts-ignore
                data.members = data.members.map((c) => {
                    c.inviter = null;
                    return c;
                });
            }
            return r(status.data<FetchedMemberInvitesResponse>(data));
        });
    },

    /**
     * [WARNING]:
     * - This uses an endpoint not documented and can be restricted to bots at any time by Discord.
     * - Due to caching on Discord's end an entry for a user might not show up for a few minutes to an hour+ (THIS CAN'T BE CHANGED)
     */
    fetch: async (guild: Guild, users: string[], fetchInviters?: boolean, fetchUses?: boolean): Promise<InviteResponseData<FetchedMemberInvitesResponse>> => {
        return new Promise(async (r) => {
            return r(
                await Invites.query(guild, {
                    search: {
                        limit: users.length,
                        and_query: { user_id: { or_query: users } },
                    },
                    fetch: {
                        inviters: fetchInviters,
                        uses: fetchUses,
                    },
                }),
            );
        });
    },

    /**
     * [WARNING]:
     * - This uses an endpoint not documented and can be restricted to bots at any time by Discord.
     * - Due to caching on Discord's end an entry for a user might not show up for a few minutes to an hour+ (THIS CAN'T BE CHANGED)
     */
    by: async (guild: Guild, user: string | string[], limit = 1000, onlyValidInvites = true): Promise<InviteResponseData<FetchedMemberInvitesResponse>> => {
        return new Promise(async (r) => {
            const list = is.array(user) ? user : [user];
            let invites = new Collection<string, Invite>();
            if (guild.members.me?.permissions.has(32n) && onlyValidInvites === true) {
                const invs = await guild.invites.fetch({ cache: false }).catch(() => null);
                if (invs) {
                    invites = invs;
                }
            }
            return r(
                await Invites.query(
                    guild,
                    {
                        search: {
                            limit,
                            and_query: {
                                join_source_type: {
                                    or_query: [5],
                                },
                                ...(invites.size
                                    ? {
                                          source_invite_code: {
                                              or_query: invites.filter((c) => c.inviterId && list.includes(c.inviterId)).map((c) => c.code),
                                          },
                                      }
                                    : {}),
                            },
                        },
                        fetch: {
                            inviters: true,
                            uses: true,
                            inviter_ids: list,
                        },
                    },
                    invites,
                ),
            );
        });
    },
    /**
     * [WARNING]:
     * - This uses an endpoint not documented and can be restricted to bots at any time by Discord.
     * - Due to caching on Discord's end an entry for a user might not show up for a few minutes to an hour+ (THIS CAN'T BE CHANGED)
     */
    formatBy: async (guild: Guild, user: string | string[], limit = 1000, ignoreInactiveInvites = true): Promise<InviteResponseData<Collection<string, FormatInvitedBy>>> => {
        return new Promise(async (r) => {
            const list = is.array(user) ? user : [user];
            const data = await Invites.by(guild, list, limit);
            if (!data.status) {
                return r(data);
            }
            const users = new Collection<string, FormatInvitedBy>();
            for (const id of list) {
                let l = data.data.members.filter((c) => c.inviter_id === id && c.source_invite_code);
                if (ignoreInactiveInvites === true) {
                    l = l.filter((c) => c.notFound === false && c.uses >= 1);
                }
                const li: {
                    type: Exclude<FetchedMemberInvite["joinType"], "bot" | "integration">;
                    code: string;
                    uses: number;
                }[] = [];
                let uses = 0;
                for (const c of l) {
                    if (!c.source_invite_code) {
                        continue;
                    }
                    const f = li.find((cc) => cc.code === c.source_invite_code);
                    if (f) {
                        f.uses++;
                    } else {
                        if (is.number(c.uses)) {
                            uses = Math.floor(uses + c.uses);
                        }
                        li.push({
                            type: c.joinType as Exclude<FetchedMemberInvite["joinType"], "bot" | "integration">,
                            code: c.source_invite_code as string,
                            uses: 1,
                        });
                    }
                }
                users.set(id, {
                    invited: l.length || 0,
                    uses: Math.floor(uses || 0),
                    codes: li,
                    members: l || [],
                });
            }
            return r(status.data(users));
        });
    },
    /**
     * [WARNING]:
     * - This uses an endpoint not documented and can be restricted to bots at any time by Discord.
     * - Due to caching on Discord's end an entry for a user might not show up for a few minutes to an hour+ (THIS CAN'T BE CHANGED)
     */
    format: async (guild: Guild, users: string[]): Promise<InviteResponseData<FetchedMemberInvitesResponse["members"]>> => {
        const res = await Invites.fetch(guild, users, true, true);
        if (!res.status || !is.array(res?.data?.members)) {
            return { status: false, message: `Unable to find any info regarding that user.` };
        }
        return {
            status: true,
            data: res.data.members,
        };
    },
};

export interface FetchedMemberInvitesResponse {
    guild_id: string;
    members: FetchedMemberInvite[];
    page_result_count: number;
    total_result_count: number;
}

export interface FetchedMemberInvite {
    member: {
        avatar: string | null;
        communication_disabled_until: string | null;
        unusual_dm_activity_until: string | null;
        flags: number;
        joined_at: string | null;
        nick: string | null;
        pending: boolean;
        premium_since: string | null;
        roles: string[];
        user: {
            id: string;
            username: string;
            avatar: string | null;
            discriminator: string | "0000" | "0";
            public_flags: number;
            premium_type?: number;
            flags: number;
            banner: string | null;
            accent_color: string | null;
            global_name: string | null;
            avatar_decoration_data: object | null;
            banner_color: string | null;
        };
        mute: boolean;
        deaf: boolean;
    };
    source_invite_code: string | null;
    notFound: boolean;
    join_source_type: number;
    uses: number;
    inviter_id: string | null;
    joinType?: "bot" | "server_discovery" | "normal" | "vanity" | "integration" | "unknown";
    inviter?: User | null;
}

export const dis = {
    application: (app: any): app is Application => {
        return app instanceof Application;
    },

    user: (user: any): user is User => {
        return user instanceof User;
    },

    member: (member: any): member is GuildMember => {
        return member instanceof GuildMember;
    },

    guild: (guild: any): guild is Guild => {
        return guild instanceof Guild;
    },

    role: (role: any): role is Role => {
        return role instanceof Role;
    },

    client: (client: any): client is Client => {
        return client instanceof Client;
    },

    channels: {
        text: (channel: any): channel is TextChannel => {
            return channel instanceof TextChannel;
        },

        voice: (channel: any): channel is VoiceChannel => {
            return channel instanceof VoiceChannel;
        },

        thread: (channel: any): channel is ThreadChannel => {
            return channel instanceof ThreadChannel;
        },

        forum: (channel: any): channel is ForumChannel => {
            return channel instanceof ForumChannel;
        },

        category: (channel: any): channel is CategoryChannel => {
            return channel instanceof CategoryChannel;
        },
    },
};

export function embedComment(str: string, color: keyof typeof Colors | number = "Red", components: ActionRowBuilder<MessageActionRowComponentBuilder>[] = [], files: InteractionEditReplyOptions["files"] = []) {
    return {
        content: "",
        embeds: [new EmbedBuilder().setDescription(str).setColor(typeof color === "number" ? color : Colors[color])],
        components,
        files,
    };
}

export async function getConfirmPrompt(channelOrInteraction: TextBasedChannel | RepliableInteraction, user: User, str: string, timer = get.secs(30)) {
    let msg: Message | null;
    const options = {
        embeds: [
            {
                author: { name: user.displayName, icon_url: user.displayAvatarURL() },
                title: `Prompt`,
                description: str,
                color: colors.orange,
                fields: [{ name: "\u200b", value: `> Expires ${time.countdown(timer)}` }],
                footer: {
                    text: `ID: ${user.id}`,
                },
            },
        ],
        components: [
            {
                type: 1,
                components: [
                    {
                        type: 2,
                        custom_id: `prompt:confirm`,
                        label: "Confirm",
                        style: 3,
                    },
                    {
                        type: 2,
                        custom_id: `prompt:cancel`,
                        label: "Cancel",
                        style: 4,
                    },
                ],
            },
        ],
    };
    if ("deferred" in channelOrInteraction) {
        if (channelOrInteraction.deferred) {
            msg = await channelOrInteraction.editReply(options).catch(() => null);
        } else {
            msg = await channelOrInteraction
                .reply({
                    fetchReply: true,
                    ...options,
                })
                .catch(() => null);
        }
    } else {
        msg = await channelOrInteraction.send(options).catch(() => null);
    }
    if (!msg) {
        return null;
    }
    const col = await msg
        .awaitMessageComponent({
            filter: (i) => i.user.id === user.id && i.customId.startsWith("prompt:") && i.isButton(),
            time: timer,
        })
        .catch(() => null);
    if (!col) {
        await msg
            .edit({
                embeds: [comment(`Cancelled`, colors.red, true)],
            })
            .catch(() => null);
        return null;
    }
    if (!col.customId.includes("confirm")) {
        await col
            .update({
                embeds: [comment(`Cancelled`, colors.red, true)],
            })
            .catch(() => null);
        return null;
    }
    await col.deferUpdate().catch(() => null);
    return col;
}

export type AnyInteraction = StringSelectMenuInteraction | UserSelectMenuInteraction | RoleSelectMenuInteraction | MentionableSelectMenuInteraction | ChannelSelectMenuInteraction | ButtonInteraction;

export async function awaitComponent<D extends AnyInteraction>(
    messageOrChannel: Message | TextBasedChannel,
    options: {
        custom_ids: { id: string; includes?: boolean }[];
        users?: {
            allow: boolean;
            id: string;
        }[];
        time?: number;
    },
): Promise<D | null> {
    const filter = (i: Interaction) => {
        if (!("customId" in i)) {
            return false;
        }
        if (is.array(options.users)) {
            for (const user of options.users.filter((c) => c.allow === true)) {
                if (user.id !== i.user.id) {
                    return false;
                }
            }
            const find = options.users.find((c) => c.id === i.user.id);
            if (find) {
                if (!find.allow) {
                    return false;
                }
            }
        }
        return options.custom_ids.some((c) => (c.includes ? i.customId.includes(c.id) : i.customId === c.id));
    };
    const col = await messageOrChannel
        .awaitMessageComponent({
            filter,
            time: options.time ?? get.secs(30),
        })
        .catch(() => null);
    if (!col) {
        return null;
    }
    return col as D;
}

export type AwaitMessagesOptions = {
    max?: number;
    time?: number;
    filter?: (m: Message) => boolean;
};

export async function awaitMessage(
    channel: TextBasedChannel,
    options: Omit<AwaitMessagesOptions, "max"> = {
        filter: (m) => !m.author.bot,
        time: get.secs(30),
    },
) {
    const f = await channel
        .awaitMessages({
            filter: options.filter,
            time: options.time || get.secs(30),
            max: 1,
            errors: ["time"],
        })
        .catch(() => null);
    if (!f?.size) {
        return null;
    }
    return f.first() as Message;
}

export async function awaitMessages(
    channel: TextBasedChannel,
    options: AwaitMessagesOptions = {
        filter: (m) => !m.author.bot,
        max: 1,
        time: get.secs(30),
    },
) {
    const f = await channel
        .awaitMessages({
            filter: options.filter,
            time: options.time || get.secs(30),
            max: options.max || 1,
            errors: ["time"],
        })
        .catch(() => null);
    if (!f?.size) {
        return null;
    }
    return [...f.values()];
}

export interface ButtonOptions {
    label?: string;
    style?: ButtonStyle;
    emoji?: ComponentEmojiResolvable;
    id?: string;
    url?: string;
    disabled?: boolean;
}

export function addButton(options: ButtonOptions) {
    const button = new ButtonBuilder();
    if (options.id) {
        button.setCustomId(options.id);
    }
    if (options.url) {
        button.setURL(options.url).setStyle(ButtonStyle.Link);
    } else if (options.style) {
        button.setStyle(options.style);
    }

    if (options.label) {
        button.setLabel(options.label);
    }
    if (options.emoji) {
        button.setEmoji(options.emoji);
    }
    if (is.boolean(options.disabled)) {
        button.setDisabled(options.disabled);
    }
    if (!button.data.label && !button.data.emoji) {
        button.setEmoji("🤔"); // This only happens if there is no label or emoji to avoid erroring out the command.
    }
    return button;
}

export function addButtonRow(options: ButtonOptions | ButtonOptions[]) {
    const row = new ActionRowBuilder<ButtonBuilder>();
    if (Array.isArray(options) && options.length) {
        for (const option of options) {
            row.addComponents(addButton(option));
        }
    } else if (is.object(options)) {
        row.addComponents(addButton(options as ButtonOptions));
    }
    return row;
}

export type ValidNumber = 1 | 2 | 3 | 4 | 5;

export function displayButtonRandomly(
    button: ButtonOptions,
    options: Partial<{
        top: ValidNumber;
        middle: ValidNumber;
        bottom: ValidNumber;
    }> = {
        top: 3,
        middle: 3,
        bottom: 3,
    },
    defaultButtons?: Partial<{
        style: ButtonStyle;
        emoji: ComponentEmojiResolvable;
        label: string;
    }>,
) {
    const get = (num: number): ButtonOptions[] =>
        new Array(num).fill(0).map(() => ({
            id: snowflakes.generate(),
            emoji: defaultButtons?.emoji || { id: "868584026913505281" },
            style: defaultButtons?.style || ButtonStyle.Secondary,
            label: defaultButtons?.label || undefined,
        }));
    const t = get(options.top ?? 3);
    const m = get(options.middle ?? 3);
    const b = get(options.bottom ?? 3);
    const all = [...t, ...m, ...b];
    shuffle(all);
    let random = all[Math.floor(Math.random() * all.length)];
    while (!random) {
        random = all[Math.floor(Math.random() * all.length)];
    }

    return chunk(
        all.map((c) => {
            if (c.id === random.id) {
                c = button;
            }
            return c;
        }),
        3,
    ).map((c) => addButtonRow(c));
}

export type EventOptions = XOR<{ name: string; includes?: boolean; run: (eventName: string, ...args: unknown[]) => Promise<unknown> | unknown }, { regex: RegExp; run: (eventName: string, ...args: unknown[]) => Promise<unknown> | unknown }>;

export function listenForRawEvents(client: Client, events: EventOptions[], once = false) {
    if (!is.array(events)) {
        return log(`[LISTEN:FOR:RAW:EVENTS]: No events provided.`);
    }
    if (!dis.client(client)) {
        return log(`[LISTEN:FOR:RAW:EVENTS]: Invalid client provided.`);
    }
    client[once ? "once" : "on"]("raw", (p) => {
        if (!p.t || !p.d) {
            return;
        }
        const e = (p.t as string).toLowerCase();
        for (const event of events) {
            if (is.string(event.name)) {
                if (event.includes === true) {
                    if (e.includes(event.name)) {
                        event.run(p.t, p.d);
                        continue;
                    }
                } else {
                    if (event.name === e) {
                        event.run(p.t, p.d);
                        continue;
                    }
                }
            }
            if (event.regex) {
                if (e.match(event.regex)) {
                    event.run(p.t, p.d);
                    continue;
                }
            }
        }
    });
}
