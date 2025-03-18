import { fetch } from "@elara-services/fetch";
import readline from "readline";
import { get, status } from "./status";
import { ms } from "./times";

export function field(name = "\u200b", value = "\u200b", inline = false) {
    return { name, value, inline };
}

/**
 * Sends an prompt to the console for input text. (uses 'readline') and returns a string with the response
 */
export async function ask(content: string, timer = get.secs(20)): Promise<{ status: true, input: string } | { status: false, message: string }> {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise((r) => {
        const timeouts = new Set<NodeJS.Timeout>();
        const end = (str: string, m: number) => {
            if (m <= 0) {
                return;
            }
            timeouts.add(
                setTimeout(() => {
                    r(status.error(str));
                    rl.close();
                }, m)
            );
        };
        if (timer > get.mins(5)) { // If the timer is above 5 minutes then set it to exactly 5 minutes, 
            timer = get.mins(5);
        }
        end(`Prompt expired due to no input after ${ms.get(timer, true)}`, timer);
        end(`Prompt has been active for 6+ minutes with no input, closing.`, get.mins(6));
        return rl.question(content + "\n\n- Input: ", (c) => {
            r({ status: true, input: c });
            for (const v of timeouts.values()) {
                clearTimeout(v);
            }
            rl.close();
        });
    });
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

export async function fetchAttachment<D extends object>(
    url: string
): Promise<{ status: true; data: D } | { status: false; message: string }> {
    if (!url.toLowerCase().includes(".json")) {
        return status.error(`You didn't provide a valid .json file.`);
    }
    const res = await fetch(url)
        .send()
        .catch(() => null);
    if (!res || res.statusCode !== 200) {
        return status.error(`Unable to fetch the attachment data.`);
    }
    const data = res.json<D>();
    if (!data) {
        return status.error(`Unable to fetch the attachment data.`);
    }
    return status.data(data);
}

export type Entries<T> = {
    [K in keyof T]: [K, T[K]];
}[keyof T][];

export const getEntries = <T extends object>(obj: T) =>
    Object.entries(obj) as Entries<T>;
export const getKeys = <T extends object>(obj: T) =>
    Object.keys(obj) as (keyof T)[];

export function generate(
    length = 10,
    options?: {
        upperLetters?: boolean;
        lowerLetters?: boolean;
        numbers?: boolean;
        symbols?: boolean;
    }
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

    let charatters = "";

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

    let code = "";

    for (let i = 0; i < length; i++) {
        code += charatters.charAt(
            Math.floor(Math.random() * charatters.length)
        );
    }

    return code;
}

export function decodeHTML(str: string): string {
    return String(str)
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/(&#(\d+);)/g, (m: string, c, charCode) =>
            String.fromCharCode(charCode)
        );
}

export function shuffle(array: unknown[]) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
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
        const str = Buffer.from(
            process.env[name] as string,
            "base64"
        ).toString();
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
        return `US ${split.slice(0, 1).toUpperCase() +
            `${split.slice(1, split.length).toLowerCase()}`
            }`;
    }
    const str = `${name.slice(0, 1).toUpperCase()}${name
        .slice(1, name.length)
        .toLowerCase()}`,
        by = (n: string) =>
            str
                .split(n)
                .map(
                    (c) =>
                        `${c.slice(0, 1).toUpperCase()}${c
                            .slice(1, c.length)
                            .toLowerCase()}`
                )
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

export const noop = () => null;
