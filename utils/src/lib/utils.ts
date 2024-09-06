import { fetch } from "@elara-services/packages";
import { DeconstructedSnowflake, DiscordSnowflake, SnowflakeGenerateOptions } from "@sapphire/snowflake";
import { is } from "./is";
import { status } from "./status";

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
