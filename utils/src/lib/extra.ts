import { SDK } from "@elara-services/sdk";
import { is } from "./is";

export const services = new SDK();

// eslint-disable-next-line prefer-const
export let binDefs = {
    viewer: `https://view.elara.workers.dev`,
};
// eslint-disable-next-line prefer-const
export let bins = {
    mine: "https://h.elara.workers.dev",
    haste: "https://h.s8n.workers.dev", // Default haste server, since hastebin.com requires a bin-key now.
    pizza: "https://haste.unbelievaboat.com",
};

export type Bins = keyof typeof bins;

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

export function hasBit(bitfield: number, bit: number) {
    if ((bitfield & bit) === bit) {
        return true;
    }
    return false;
}

export async function createBin(title: string, args: string, ext = "js", bin: Bins | "mine-f" | "custom" = "mine-f", priv = false) {
    const fetch = async (args: string, url: string, backup: string) => {
        if (!services) {
            return null;
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
    if (bin === "mine-f") {
        const b = await services.paste.post(title, args, priv);
        if (!b.status) {
            return fetch(args, bins.mine, bins.haste);
        }
        if (["messages", "discord"].includes(ext)) {
            return `${binDefs.viewer}/${ext}/${b.id}`;
        }
        return `${binDefs.viewer}/bin/${b.id}`;
    }
    const binUrl = bins[bin as Bins];
    if (is.string(binUrl)) {
        return fetch(args, binUrl, bin === "mine" ? bins.haste : bins.mine);
    }
    return fetch(args, bin.match(/http(s)?:\/\//i) ? bin : bins.mine, bins.mine);
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
    get: <D extends object>(name: string, parseObj = false): string | D => {
        if (!process.env[name]) {
            return "";
        }
        const str = Buffer.from(process.env[name] as string, "base64").toString();
        if (parseObj) {
            try {
                return JSON.parse(str) as D;
            } catch {
                return {} as D;
            }
        }
        return str;
    },
    getObj: <D extends object>(name: string): D => env.get<D>(name, true) as D,
    parse: (data: string) => Buffer.from(data).toString("base64"),
};

export type Entries<T> = {
    [K in keyof T]: [K, T[K]];
}[keyof T][];

export const getEntries = <T extends object>(obj: T) => Object.entries(obj) as Entries<T>;
export const getKeys = <T extends object>(obj: T) => Object.keys(obj) as (keyof T)[];

export function generate(
    length: number = 10,
    options?: {
        upperLetters?: boolean;
        lowerLetters?: boolean;
        numbers?: boolean;
        symbols?: boolean;
    },
): string {
    let upperLetters = options?.upperLetters ?? true;
    let lowerLetters = options?.lowerLetters ?? true;
    let numbers = options?.numbers ?? true;
    let symbols = options?.symbols ?? false;

    if (!length || length <= 0) {
        length = 10;
    }
    if (!upperLetters && !lowerLetters && !numbers && !symbols) {
        upperLetters = true;
        lowerLetters = true;
        numbers = false;
        symbols = false;
    }

    let charatters: string = "";

    if (upperLetters) {
        charatters += "ABCDEFGHIJKLMNOPQRSTUWXYZ";
    }
    if (lowerLetters) {
        charatters += "abcdefghijklmnpqrstuwxyz";
    }
    if (numbers) {
        charatters += "1234567890";
    }
    if (symbols) {
        charatters += "!@#$%^&*.()";
    }

    let code: string = "";

    for (let i = 0; i < length; i++) {
        code += charatters.charAt(Math.floor(Math.random() * charatters.length));
    }

    return code;
}

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

export function getNearest(n: number, maxNumber = 1000) {
    if (n < 0) {
        return 0;
    }
    return Math.ceil(n / maxNumber) * maxNumber;
}

export function getAverage(arr: number[]) {
    return Math.floor(arr.reduce((a, b) => a + b) / arr.length);
}

export function convertiOSShit(str: string) {
    // Fuck you Apple
    return str.replace(/’/g, "'").replace(/“|”/g, '"');
}

export function getRandom<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)] as T;
}
export function getRandomValue(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
