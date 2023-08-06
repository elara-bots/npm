import { SDK } from "@elara-services/sdk";
import { Application, CategoryChannel, Client, ForumChannel, Guild, GuildMember, Role, TextChannel, ThreadChannel, User, VoiceChannel } from "discord.js";
export const services = new SDK();

export function sleep(timeout?: number) {
    return new Promise((r) => setTimeout(r, timeout));
}

export function chunk<T>(arr: T[], size: number): T[][] {
    const array: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
        array.push(arr.slice(i, i + size));
    }
    return array;
}

export function proper(name: string, splitBy?: string) {
    if (name.startsWith("us-")) {
        const split = name.split("-")[1];
        return `US ${split.slice(0, 1).toUpperCase() + `${split.slice(1, split.length).toLowerCase()}`}`;
    }
    const str = `${name.slice(0, 1).toUpperCase()}${name.slice(1, name.length).toLowerCase()}`,
        by = (n: string) =>
            str
                .split(n)
                .map((c) => `${c.slice(0, 1).toUpperCase()}${c.slice(1, c.length).toLowerCase()}`)
                .join(" ");
    if (str.includes("_")) {
        return by("_");
    }
    if (str.includes(".")) {
        return by(".");
    }
    if (splitBy && str.includes(splitBy)) {
        return by(splitBy);
    }
    return str;
}

export async function createBin(title: string, args: string, ext = "js", bin = "mine-f", priv = false) {
    const bins = {
            mine: "https://haste.elara.services",
            haste: "https://hastebin.com",
            pizza: "https://haste.unbelievaboat.com",
        },
        fetch = async (args: string, url: string, backup: string) => {
            if (!services) {
                return;
            }
            let res = await services.haste.post(args, {
                extension: ext ?? "js",
                url,
            });
            if (!res.status) {
                res = await services.haste.post(args, {
                    extension: ext ?? "js",
                    url: backup,
                });
            }
            return res.status ? res.url : `Unable to create any paste link.`;
        };
    switch (bin) {
        case "mine":
        case "haste":
        case "pizza":
            return fetch(args, bins[bin], bin === "mine" ? bins.haste : bins.mine);
        case "mine-f": {
            const b = await services.paste.post(title, args, priv);
            if (!b.status) {
                return fetch(args, bins.mine, bins.haste);
            }
            if (["messages", "discord"].includes(ext)) {
                return `https://my.elara.services/${ext}/${b.id}`;
            }
            return `https://my.elara.services/b/v/${b.id}`;
        }
        default:
            return fetch(args, bin.match(/http(s)?:\/\//i) ? bin : bins.mine, bins.mine);
    }
}

export function shuffle(array: unknown[]) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

export function formatNumber(num: string | number, showInfinitySymbol = false) {
    if (showInfinitySymbol && num === Infinity) {
        return "∞";
    }
    return num.toLocaleString();
}

export const colors = {
    red: 0xff0000,
    green: 0xff000,
    yellow: 0xfaff00,
    orange: 0xff8300,
    cyan: 0x00ffe9,
    purple: 0xb28dff,
    default: 0x36393e,
};

export const env = {
    get: (name: string, parseObj = false): string | object => {
        if (!process.env[name]) {
            return "";
        }
        const str = Buffer.from(process.env[name] as string, "base64").toString();
        if (parseObj) {
            try {
                return JSON.parse(str) as object;
            } catch {
                return {};
            }
        }
        return str;
    },
    parse: (data: string) => {
        return Buffer.from(data).toString("base64");
    },
};

export type Entries<T> = {
    [K in keyof T]: [K, T[K]];
}[keyof T][];

export const getEntries = <T extends object>(obj: T) => {
    return Object.entries(obj) as Entries<T>;
};

export const getKeys = <T extends object>(obj: T) => {
    return Object.keys(obj) as (keyof T)[];
};

export function generate(stringLength = 5) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let str = "";
    for (let i = 0; i < stringLength; i++) {
        str += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return str;
}

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

export function decodeHTML(str: string): string {
    return String(str)
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/(&#(\d+);)/g, (m: string, c, charCode) => String.fromCharCode(charCode));
}
export const DefaultColors = {
    DEFAULT: 0x000000,
    WHITE: 0xffffff,
    AQUA: 0x1abc9c,
    GREEN: 0x2ecc71,
    BLUE: 0x3498db,
    YELLOW: 0xffff00,
    PURPLE: 0x9b59b6,
    LUMINOUS_VIVID_PINK: 0xe91e63,
    GOLD: 0xf1c40f,
    ORANGE: 0xe67e22,
    RED: 0xe74c3c,
    GREY: 0x95a5a6,
    NAVY: 0x34495e,
    DARK_AQUA: 0x11806a,
    DARK_GREEN: 0x1f8b4c,
    DARK_BLUE: 0x206694,
    DARK_PURPLE: 0x71368a,
    DARK_VIVID_PINK: 0xad1457,
    DARK_GOLD: 0xc27c0e,
    DARK_ORANGE: 0xa84300,
    DARK_RED: 0x992d22,
    DARK_GREY: 0x979c9f,
    DARKER_GREY: 0x7f8c8d,
    LIGHT_GREY: 0xbcc0c0,
    DARK_NAVY: 0x2c3e50,
    BLURPLE: 0x7289da,
    GREYPLE: 0x99aab5,
    DARK_BUT_NOT_BLACK: 0x2c2f33,
    NOT_QUITE_BLACK: 0x23272a,
};

export function resolveColor(color: string | number | number[] | undefined) {
    if (typeof color === "string") {
        if (color === "RANDOM") {
            return Math.floor(Math.random() * (0xffffff + 1));
        }
        if (color === "DEFAULT") {
            return DefaultColors.DEFAULT;
        }
        color = DefaultColors[color as keyof typeof DefaultColors] || parseInt(color.replace("#", ""), 16);
    } else if (Array.isArray(color)) {
        color = (color[0] << 16) + (color[1] << 8) + color[2];
    }

    if (typeof color === "number") {
        if (color < 0 || color > 0xffffff) {
            color = 0;
        } else if (color && isNaN(color)) {
            color = 0;
        }
    }
    return color;
}
