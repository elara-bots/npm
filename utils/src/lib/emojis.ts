// @ts-ignore
import * as fetch from "@elara-services/fetch";
import type { Emoji } from "discord.js";

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

export async function getDiscordEmoji(emoji: Emoji | null) {
    if (!emoji) {
        return null;
    }
    if (!emoji.id) {
        const emote = getUnicodeEmoji(emoji.name);
        if (!emote) {
            return null;
        }
        const url = `https://twemoji.maxcdn.com/v/12.1.4/72x72/${emote}.png`;
        const res = await fetch(url)
            .timeout(5000)
            .header(
                "User-Agent",
                `Services v${Math.floor(Math.random() * 5000)}`,
            )
            .send()
            .catch(() => ({ statusCode: 500 }));
        if (res?.statusCode !== 200) {
            return null;
        }
        return {
            name: emoji.name,
            id: null,
            animated: false,
            url,
            raw: emoji.name,
        };
    }
    return {
        name: emoji.name,
        id: emoji.id,
        animated: emoji.animated,
        url: `https://cdn.discordapp.com/emojis/${emoji.id}${
            emoji.animated ? ".gif" : ".png"
        }`,
        raw: `<${emoji.animated ? "a" : ""}:${emoji.name}:${emoji.id}>`,
    };
}
