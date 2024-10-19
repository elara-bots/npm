import { CDNRoutes, DefaultUserAvatarAssets, EmojiFormat, GuildIconFormat, UserAvatarFormat, UserBannerFormat } from "discord-api-types/v10";
export type ImageExtension = "png" | "jpg" | "webp" | "jpeg" | "gif";
export const is = {
    string: (name: any, checkEmpty = true): name is string => {
        if (typeof name === "string") {
            if (checkEmpty && !name) {
                return false;
            }
            return true;
        }
        return false;
    },

    number: (num: any, checkEmpty = true): num is number => {
        if (typeof num === "number" && !isNaN(num)) {
            if (checkEmpty && num <= 0) {
                return false;
            }
            return true;
        }
        return false;
    },

    boolean: (bool: any): bool is boolean => {
        return typeof bool === "boolean";
    },

    array: <T>(arr: T[] | unknown, checkEmpty = true): arr is T[] => {
        if (Array.isArray(arr)) {
            if (checkEmpty && !arr.length) {
                return false;
            }
            return true;
        }
        return false;
    },

    object: (obj: any): obj is object => {
        return typeof obj === "object";
    },

    error: (err: any): err is Error => {
        return err instanceof Error;
    },

    undefined: (und: any): und is undefined => {
        return typeof und === "undefined" || und === undefined;
    },

    null: (name: any): name is null => {
        return name === null;
    },
    promise: (promise: any): promise is Promise<any> => {
        return promise instanceof Promise;
    },
};

export function getPluralTxt(arrOrNum: unknown[] | number): "" | "s" {
    if (is.array(arrOrNum)) {
        if (arrOrNum.length >= 2) {
            return "s";
        }
    } else if (is.number(arrOrNum)) {
        if (arrOrNum >= 2) {
            return "s";
        }
    }
    return "";
}

/**
 * @deprecated
 * @description Use make.array()
 */
export function makeArray<T>(arr?: T[]): T[] {
    return make.array<T>(arr);
}

export function noop() {
    return null;
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
    set: <T>(val?: Set<T>): Set<T> => (val instanceof Set ? val : new Set<T>()) as Set<T>,
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

export function includes(content: string | number, arr: (string | number)[], useIncludes = false) {
    return arr.some((c) => (useIncludes ? content.toString().includes(`${c}`) : content === c));
}
