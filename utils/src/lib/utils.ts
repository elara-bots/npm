import { fetch } from "@elara-services/packages";
import { DeconstructedSnowflake, DiscordSnowflake, SnowflakeGenerateOptions } from "@sapphire/snowflake";
import { CDNRoutes, DefaultUserAvatarAssets, EmojiFormat, GuildIconFormat, UserAvatarFormat, UserBannerFormat } from "discord-api-types/v10";
import { is } from "./is";
import { status } from "./status";

export type ImageExtension = "png" | "jpg" | "webp" | "jpeg" | "gif";

export function commands(content: string, prefix: string) {
    if (!is.string(content)) {
        return {
            name: "",
            args: [],
            hasPrefix() {
                return false;
            },
            isCommand() {
                return false;
            },
        };
    }
    const str = content?.split(/ +/g) || "";
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

export function field(name = "\u200b", value = "\u200b", inline = false) {
    return { name, value, inline };
}

export function getClientIdFromToken(token: string) {
    return Buffer.from(token.split(".")[0], "base64").toString();
}

export const snowflakes = {
    get: (id: string) => {
        const data = DiscordSnowflake.deconstruct(id) as DeconstructedSnowflake & { date: Date };
        data.date = new Date(DiscordSnowflake.timestampFrom(data.id));
        return data;
    },
    generate: (options?: SnowflakeGenerateOptions) => DiscordSnowflake.generate(options).toString(),
};

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

export async function fetchAttachment<D extends object>(url: string): Promise<{ status: true; data: D } | { status: false; message: string }> {
    if (!url.toLowerCase().includes(".json")) {
        return status.error(`You didn't provide a valid .json file.`);
    }
    const r = await fetch<object, D>(url);
    if (!r) {
        return status.error(`Unable to fetch the attachment data.`);
    }
    return status.data(r);
}
function getExtension<D extends ImageExtension>(str?: string, ex: ImageExtension = "png", forceStatic = false) {
    if (str?.startsWith("a_") && !forceStatic) {
        ex = "gif";
    }
    return ex as D;
}

const main = `discord.com`;

export const make = {
    array: <T>(arr?: T[]): T[] => (is.array(arr) ? arr : []) as T[],
    set: <T>(val?: Set<T>): Set<T> => (val instanceof Set ? val : new Set()) as Set<T>,
    cdn: (ex: string, proxy = false) => `https://${proxy ? `media.discordapp.net` : `cdn.discordapp.com`}/${ex}`,
    emojiURL: (id: string, ext: ImageExtension = "png", size?: number) => `${make.cdn(CDNRoutes.emoji(id, getExtension<EmojiFormat>(id, ext, false)))}${size ? `?size=${size}` : ""}`,
    guildURL: (guildId: string) => `https://${main}/channels/${guildId}` as const,
    channelURL: (guildId: string, channelId: string) => `https://${main}/channels/${guildId}/${channelId}` as const,
    messageURL: (guildId: string, channelId: string, messageId: string) => `https://${main}/channels/${guildId}/${channelId}/${messageId}` as const,

    webhook: (
        id: string,
        token: string,
        options?: Partial<{
            /** The thread ID for the message */
            threadId: string;
            /** The API version to use for requests, by default it will use '/api/webhooks' with no version */
            version: string;
            /** The messageID for patch webhook requests */
            message: string;
            /** By default, wait is set to true */
            wait: boolean;
            /** The API Route to use, by default it's the stable version */
            build: "canary" | "ptb";
        }>,
    ) => {
        const url = new URL(`https://${options?.build ? `${options.build}.` : ""}${main}/api${options?.version ? `/${options.version}` : ""}/webhooks/${id}/${token}${options?.message ? `/messages/${options?.message}` : ""}`);
        if (is.boolean(options?.wait)) {
            url.searchParams.append(`wait`, `${options?.wait || "false"}`);
        } else if (is.undefined(options?.wait)) {
            url.searchParams.append(`wait`, "true");
        }
        if (is.string(options?.threadId)) {
            url.searchParams.append("thread_id", options?.threadId as string);
        }

        return url.toString();
    },
    image: {
        users: {
            avatar: (userId: string, avatar?: string, forceStatic = false, ex: ImageExtension = "png", size?: number, proxy?: boolean) => {
                if (!avatar) {
                    // @ts-ignore
                    const index = (userId >> 22) % 6;
                    return `${make.cdn(CDNRoutes.defaultUserAvatar(index as DefaultUserAvatarAssets), proxy)}${size ? `?size=${size}` : ""}`;
                }
                return `${make.cdn(CDNRoutes.userAvatar(userId, avatar, getExtension<UserAvatarFormat>(avatar, ex, forceStatic)), proxy)}${size ? `?size=${size}` : ""}`;
            },

            banner: (userId: string, banner?: string, forceStatic = false, ex: ImageExtension = "png", size?: number, proxy?: boolean) => {
                return banner && `${make.cdn(CDNRoutes.userBanner(userId, banner, getExtension<UserBannerFormat>(banner, ex, forceStatic)), proxy)}${size ? `?size=${size}` : ""}`;
            },
        },
        guild: {
            icon: (guildId: string, icon?: string, forceStatic = false, ex: ImageExtension = "png", size?: number, proxy?: boolean) => {
                return icon && `${make.cdn(CDNRoutes.guildIcon(guildId, icon, getExtension<GuildIconFormat>(icon, ex, forceStatic)), proxy)}${size ? `?size=${size}` : ""}`;
            },

            banner: (guildId: string, banner?: string, forceStatic = false, ex: ImageExtension = "png", size?: number, proxy?: boolean) => {
                return banner && `${make.cdn(CDNRoutes.guildBanner(guildId, banner, getExtension<GuildIconFormat>(banner, ex, forceStatic)), proxy)}${size ? `?size=${size}` : ""}`;
            },
        },

        sticker: (id: string, ext: "png" | "json" | "apng" | "gif" = "png", size?: number, proxy?: boolean) => {
            return make.cdn(`stickers/${id}.${ext}${size && ext !== "json" ? `?size=${size}` : ""}`, proxy);
        },
    },
};
