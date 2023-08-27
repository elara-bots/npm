import { Collection } from "@discordjs/collection";
import { Channel, Client, EmbedBuilder, Guild, GuildMember, Message, MessageCreateOptions, MessagePayload, Role, SnowflakeGenerateOptions, SnowflakeUtil, User, type GuildBan, type PermissionResolvable } from "discord.js";
import { is, sleep } from "./extra";
export type errorHandler = (e: Error) => unknown;

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
