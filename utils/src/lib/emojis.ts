import type { Emoji, PartialEmoji } from "discord.js";
import { is } from "./is";
import { make } from "./utils";

const getTwemojiURL = (name: string) => `https://cdn.jsdelivr.net/gh/twitter/twemoji@v12.1.4/assets/72x72/${name}.png`;
const twemoji = /^(?:\d\ufe0f?\u20e3|\p{Emoji_Presentation})$/giu;

export function getUnicodeEmoji(emoji: string | null) {
    if (!emoji) {
        return null;
    }
    const r = [];
    let [c, p, i] = [0, 0, 0];

    while (i < emoji.length) {
        c = emoji.charCodeAt(i++);
        if (p) {
            r.push(
                // @ts-ignore
                (0x10000 + ((p - 0xd800) << 10) + (c - 0xdc00)).toString(16),
            );
            p = 0;
        } else if (c >= 0xd800 && c <= 0xdbff) {
            p = c;
        } else {
            // @ts-ignore
            r.push(c.toString(16));
        }
    }
    return r.join("-");
}

export function getDiscordEmoji(emoji: Emoji | PartialEmoji | null) {
    if (!emoji) {
        return null;
    }
    if (!emoji.id) {
        if (!twemoji.test(emoji.name || "")) {
            return null;
        }
        const emote = getUnicodeEmoji(emoji.name);
        if (!emote) {
            return null;
        }
        return {
            name: emoji.name,
            id: null,
            animated: false,
            url: getTwemojiURL(emote),
            raw: emoji.name,
        };
    }
    return {
        name: emoji.name,
        id: emoji.id,
        animated: emoji.animated,
        url: make.emojiURL(emoji.id, emoji.animated ? "gif" : "png"),
        raw: `<${emoji.animated ? "a" : ""}:${emoji.name}:${emoji.id}>`,
    };
}

export function getDiscordIdFromEmoji(str: string) {
    if (!str.startsWith("<") && !str.endsWith(">")) {
        return "";
    }
    return str.split(">")[0].split(":")[2];
}

export function getDiscordEmojis(str: string) {
    const matches = str.match(/<(?<animated>a)?:(?<name>\w{2,32}):(?<id>\d{17,21})>/gim);
    const twemojiMatches = str.match(twemoji);
    const emojis: {
        name: string;
        url: string;
        animated: boolean;
        matching: string;
    }[] = [];
    if (matches?.length) {
        for (const e of matches) {
            const id = getDiscordIdFromEmoji(e);
            if (!is.string(id)) {
                continue;
            }
            const animated = e.startsWith("<a:") ? true : false;
            emojis.push({
                name: "unknown",
                url: make.emojiURL(id, animated ? "gif" : "png"),
                animated,
                matching: e,
            });
        }
    }
    if (twemojiMatches?.length) {
        for (const e of twemojiMatches) {
            const em = getUnicodeEmoji(e);
            if (!em) {
                continue;
            }
            emojis.push({
                name: e,
                url: getTwemojiURL(em),
                animated: false,
                matching: e,
            });
        }
    }
    return emojis;
}
