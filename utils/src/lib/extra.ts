import Services from "elara-services";
export const services = new Services("[KEY_NOT_SET]");

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
        return `US ${
            split.slice(0, 1).toUpperCase() +
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
                            .toLowerCase()}`,
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

export async function createBin(
    title: string,
    args: string,
    ext = "js",
    bin = "mine-f",
    priv = false,
) {
    const bins = {
            mine: "https://haste.elara.services",
            haste: "https://hastebin.com",
            pizza: "https://haste.unbelievaboat.com",
        },
        fetch = async (args: string, url: string, backup: string) => {
            if (!services) {
                return;
            }
            let res = (await services.haste.post(args, {
                extension: ext ?? "js",
                url,
            })) as { status: boolean; url: string };
            if (!res.status) {
                res = (await services.haste.post(args, {
                    extension: ext ?? "js",
                    url: backup,
                })) as { status: boolean; url: string };
            }
            return res.status ? res.url : `Unable to create any paste link.`;
        };
    switch (bin) {
        case "mine":
        case "haste":
        case "pizza":
            return fetch(
                args,
                bins[bin],
                bin === "mine" ? bins.haste : bins.mine,
            );
        case "mine-f": {
            const b = (await services.paste.post(title, args, priv)) as {
                status: boolean;
                key: string;
                id: string;
            };
            if (b.status && ["messages", "discord"].includes(ext)) {
                return `https://my.elara.services/${ext}/${b.id}`;
            }
            return b.status
                ? `https://my.elara.services/b/v/${b.key}`
                : fetch(args, bins.mine, bins.haste);
        }
        default:
            return fetch(
                args,
                bin.match(/http(s)?:\/\//i) ? bin : bins.mine,
                bins.mine,
            );
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
    get: (name: string) => {
        if (!process.env[name]) {
            return "";
        }
        return Buffer.from(process.env[name] as string, "base64").toString();
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
