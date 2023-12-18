import { Collection } from "@discordjs/collection";
import { Channel, Client, EmbedBuilder, Guild, GuildMember, Message, MessageCreateOptions, MessagePayload, Role, SnowflakeGenerateOptions, SnowflakeUtil, User, version, type GuildBan, type Invite, type PermissionResolvable } from "discord.js";
import { is, sleep } from "./extra";
import { checkChannelPerms } from "./permissions";
import { status } from "./status";
export type errorHandler = (e: Error) => unknown;

export function isV13() {
    return version.startsWith("13.");
}

export function commands(content: string, prefix: string) {
    const str = content.split(/ +/g);
    const name = str[0].slice(prefix.length).toLowerCase();
    return {
        name,
        args: str.slice(1),
        hasPrefix() {
            if (content.toLowerCase().startsWith(prefix)) {
                return true;
            }
            return false;
        },
        isCommand(commandName: string) {
            if (commandName === name) {
                return true;
            }
            return false;
        },
    };
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
    channel: async (client: Client, id: string, guildToSearch: Guild | null = null): Promise<Channel | null> => {
        if (!client || !is.string(id)) {
            return null;
        }
        const hm = id.match(/^(?:<#?)?([0-9]+)>?$/);
        if (!hm) {
            if (guildToSearch) {
                return guildToSearch.channels.cache.find((c) => c.name.includes(id)) ?? null;
            }
            return null;
        }
        if (client.channels.cache.has(hm[1])) {
            return client.channels.resolve(hm[1]);
        }
        return (await client.channels.fetch(hm[1]).catch(() => {})) || null;
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

export function field(name = "\u200b", value = "\u200b", inline = false) {
    return { name, value, inline };
}
export function lazyField(embed: EmbedBuilder, name = "\u200b", value = "\u200b", inline = false) {
    if ("addFields" in embed) {
        return embed.addFields(field(name, value, inline));
    }
    return field(name, value, inline);
}

export function getClientIdFromToken(token: string) {
    return Buffer.from(token.split(".")[0], "base64").toString();
}

export const snowflakes = {
    get: (id: string) => {
        return SnowflakeUtil.deconstruct(id);
    },
    generate: (options?: SnowflakeGenerateOptions) => {
        return SnowflakeUtil.generate(options);
    },
};

export async function deleteMessage(message: Message, timeout = 5000) {
    if (timeout <= 0) {
        return message.delete().catch(() => null);
    }
    return sleep(timeout).then(() => message.delete().catch(() => null));
}

export const limits = {
    audit: 512,
    content: 2000,
    embeds: {
        max: 10,
        characters: 6000,
    },
    title: 256,
    description: 4096,
    fields: 25,
    field: {
        name: 256,
        value: 1024,
    },
    footer: {
        text: 2048,
    },
    author: {
        name: 256,
    },
};

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

    fetch: async (guild: Guild, users: string[], fetchInviters?: boolean, fetchUses?: boolean): Promise<{ status: false; message: string } | { status: true; data: FetchedMemberInvitesResponse }> => {
        return new Promise(async (r) => {
            if (!guild.features.includes("COMMUNITY")) {
                return r(status.error(`Server ${guild.name} (${guild.id}) doesn't have "COMMUNITY" enabled so this cannot be used.`));
            }
            const body = {
                limit: users.length,
                and_query: { user_id: { or_query: users } },
            };
            let data: FetchedMemberInvitesResponse | Error = new Error(`Unable to fetch the members invites.`);
            const fetch = async () => {
                if (isV13()) {
                    // @ts-ignore
                    data = (await guild.client.api
                        // @ts-ignore
                        .guilds(guild.id)("members-search")
                        .post({ data: body })
                        // @ts-ignore
                        .catch((e: Error) => e)) as FetchedMemberInvitesResponse | Error;
                } else {
                    data = (await guild.client.rest.post(`/guilds/${guild.id}/members-search`, { body }).catch((e: Error) => e)) as FetchedMemberInvitesResponse | Error;
                }
            };
            await fetch();
            if ("retry_after" in data) {
                await sleep((data.retry_after as number) * 1000);
                await fetch();
            }
            if (data instanceof Error) {
                return r(status.error(data.message));
            }
            if (fetchUses === true && guild.members.me?.permissions.has(32n)) {
                const invs = await guild.invites.fetch({ cache: false }).catch(() => null);
                if (invs?.size) {
                    // @ts-ignore
                    data.members = data.members.map((c) => {
                        const d = invs.find((i) => i.code === c.source_invite_code);
                        c.uses = d?.uses || 0;
                        c.notFound = d ? false : true;
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
                        } else if (c.inviter_id) {
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

    format: async (guild: Guild, users: string[]): Promise<{ status: false; message: string } | { status: true; data: FetchedMemberInvitesResponse["members"] }> => {
        const res = await Invites.fetch(guild, users, true, true);
        if (!res.status) {
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
    members: {
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
        inviter?: User | null;
    }[];
    page_result_count: number;
    total_result_count: number;
}
