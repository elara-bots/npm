import {
    CDNRoutes,
    DefaultUserAvatarAssets,
    EmojiFormat,
    GuildIconFormat,
    UserAvatarFormat,
    UserBannerFormat,
} from "discord-api-types/v10";
import { is } from "./is";
export type ImageExtension = "png" | "jpg" | "webp" | "jpeg" | "gif";

function getExtension<D extends ImageExtension>(
    str?: string,
    ex: ImageExtension = "png",
    forceStatic = false
) {
    if (str?.startsWith("a_") && !forceStatic) {
        ex = "gif";
    }
    return ex as D;
}

const main = `discord.com`;

export type KType = string | number | symbol;

export const make = {
    array: <T>(arr?: T[]): T[] => (is.array(arr) ? arr : []) as T[],
    set: <T>(val?: Set<T>): Set<T> =>
        (val instanceof Set ? val : new Set<T>()) as Set<T>,
    map: <K, V>(val?: Iterable<readonly [K, V]> | null | undefined) =>
        new Map<K, V>(val),
    object: <T>(obj?: T) => (is.object(obj) ? obj : {}) as T,
    cdn: (ex: string, proxy = false) =>
        `https://${
            proxy ? `media.discordapp.net` : `cdn.discordapp.com`
        }/${ex}`,
    emojiURL: (id: string, ext: ImageExtension = "png", size?: number) =>
        `${make.cdn(
            CDNRoutes.emoji(id, getExtension<EmojiFormat>(id, ext, false))
        )}${size ? `?size=${size}` : ""}`,
    guildURL: (guildId: string) =>
        `https://${main}/channels/${guildId}` as const,
    channelURL: (guildId: string, channelId: string) =>
        `https://${main}/channels/${guildId}/${channelId}` as const,
    messageURL: (guildId: string, channelId: string, messageId: string) =>
        `https://${main}/channels/${guildId}/${channelId}/${messageId}` as const,

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
        }>
    ) => {
        const url = new URL(
            `https://${options?.build ? `${options.build}.` : ""}${main}/api${
                options?.version ? `/${options.version}` : ""
            }/webhooks/${id}/${token}${
                options?.message ? `/messages/${options?.message}` : ""
            }`
        );
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
            avatar: (
                userId: string,
                avatar?: string,
                forceStatic = false,
                ex: ImageExtension = "png",
                size?: number,
                proxy?: boolean
            ) => {
                if (!avatar) {
                    // @ts-ignore
                    const index = (userId >> 22) % 6;
                    return `${make.cdn(
                        CDNRoutes.defaultUserAvatar(
                            index as DefaultUserAvatarAssets
                        ),
                        proxy
                    )}${size ? `?size=${size}` : ""}`;
                }
                return `${make.cdn(
                    CDNRoutes.userAvatar(
                        userId,
                        avatar,
                        getExtension<UserAvatarFormat>(avatar, ex, forceStatic)
                    ),
                    proxy
                )}${size ? `?size=${size}` : ""}`;
            },

            banner: (
                userId: string,
                banner?: string,
                forceStatic = false,
                ex: ImageExtension = "png",
                size?: number,
                proxy?: boolean
            ) => {
                return (
                    banner &&
                    `${make.cdn(
                        CDNRoutes.userBanner(
                            userId,
                            banner,
                            getExtension<UserBannerFormat>(
                                banner,
                                ex,
                                forceStatic
                            )
                        ),
                        proxy
                    )}${size ? `?size=${size}` : ""}`
                );
            },
        },
        guild: {
            icon: (
                guildId: string,
                icon?: string,
                forceStatic = false,
                ex: ImageExtension = "png",
                size?: number,
                proxy?: boolean
            ) => {
                return (
                    icon &&
                    `${make.cdn(
                        CDNRoutes.guildIcon(
                            guildId,
                            icon,
                            getExtension<GuildIconFormat>(icon, ex, forceStatic)
                        ),
                        proxy
                    )}${size ? `?size=${size}` : ""}`
                );
            },

            banner: (
                guildId: string,
                banner?: string,
                forceStatic = false,
                ex: ImageExtension = "png",
                size?: number,
                proxy?: boolean
            ) => {
                return (
                    banner &&
                    `${make.cdn(
                        CDNRoutes.guildBanner(
                            guildId,
                            banner,
                            getExtension<GuildIconFormat>(
                                banner,
                                ex,
                                forceStatic
                            )
                        ),
                        proxy
                    )}${size ? `?size=${size}` : ""}`
                );
            },
        },

        sticker: (
            id: string,
            ext: "png" | "json" | "apng" | "gif" = "png",
            size?: number,
            proxy?: boolean
        ) => {
            return make.cdn(
                `stickers/${id}.${ext}${
                    size && ext !== "json" ? `?size=${size}` : ""
                }`,
                proxy
            );
        },
    },
};

export function includes(
    content: string | number,
    arr: (string | number)[],
    useIncludes = false
) {
    return arr.some((c) =>
        useIncludes ? content.toString().includes(`${c}`) : content === c
    );
}

export function extractLinks(str: string | string[] | object) {
    if (is.object(str)) {
        str = JSON.stringify(str);
    }
    const links = make.array<string>();
    // eslint-disable-next-line no-useless-escape
    const link = (str: string) =>
        (
            (
                str.match(
                    /(https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]+\.[^\s]{2,}|www\.[a-zA-Z0-9]+\.[^\s]{2,})/g
                ) || []
            )?.map((c) => c.replace(new RegExp('"', "gi"), "")) || []
        ).filter((c) => is.string(c));
    if (is.array(str)) {
        for (const c of str) {
            links.push(...link(c));
        }
    } else if (is.string(str)) {
        links.push(...link(str));
    }
    return links;
}

export function shortenNumber(num: number, maximumSignificantDigits = 3) {
    return Intl.NumberFormat("en", {
        notation: "compact",
        maximumSignificantDigits,
    }).format(num);
}
