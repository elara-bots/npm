import { REST } from "@discordjs/rest";
import { get, is, make, noop, Nullable } from "@elara-services/basic-utils";
import { RESTPatchAPIApplicationEmojiResult, RESTPostAPIApplicationEmojiResult, Routes, type APIPartialEmoji } from "discord-api-types/v10";
import { ApplicationEmoji, Collection, resolveImage, type Emoji } from "discord.js";
import { getClientIdFromToken } from "./utils";

const getTwemojiURL = (name: string, version = "v15.1.0") => `https://cdn.jsdelivr.net/gh/jdecked/twemoji@${version}/assets/72x72/${name}.png`;
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

export function getDiscordEmoji(emoji: Emoji | APIPartialEmoji | null) {
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

type EmojiData = { name: string; id: string; toString: () => string }[];

const makeCollection = () => new Collection<string, EmojiData>();
const def = () => make.array<EmojiData[0]>();

export class EmojiClient {
    #cache = makeCollection();
    #interval: Nullable<NodeJS.Timeout> = null;
    public rest: REST;
    public clientId: string;
    public constructor(private token: string) {
        this.rest = new REST().setToken(token);
        this.clientId = getClientIdFromToken(token);
    }

    public async recacheEvery(minutes: number) {
        if (this.#interval) {
            clearInterval(this.#interval);
            this.#interval = null;
        }
        this.#interval = setInterval(() => this.fetch(false).catch(noop), get.mins(minutes));
        return this.#interval;
    }

    public get(nameOrId: string, field: "name" | "id" | "mention" = "mention", clientId = this.clientId) {
        const f = this.cache.get(clientId).find((c) => c.id === nameOrId || c.name === nameOrId);
        if (!f) {
            return "";
        }
        if (field === "mention") {
            return f.toString();
        }
        return f[field] || "";
    }

    public get cache() {
        return {
            get: (clientId: string = this.clientId) => {
                const data = this.#cache.get(clientId);
                if (data) {
                    return data;
                }
                this.#cache.set(clientId, def());
                return this.#cache.get(clientId) || def();
            },
            set: (data: EmojiData, clientId: string = this.clientId) => {
                this.#cache.set(clientId, data);
                return this.cache;
            },
            del: (clientId: string = this.clientId) => {
                this.#cache.delete(clientId);
                return this.cache;
            },
            keys: () => [...this.#cache.keys()],
            list: () => [...this.#cache.entries()],
            has: (clientId: string = this.clientId) => this.#cache.has(clientId),
            clear: () => {
                this.#cache.clear();
                return this.cache;
            },

            add: (name: string, id: string, animated = false, clientId: string = this.clientId) => {
                const d = this.cache.get(clientId);
                this.cache.set([...d, this.#emoji(name, id, animated)], clientId);
                return this.cache;
            },
            remove: (nameOrId: string, clientId: string = this.clientId) => {
                const d = this.cache.get(clientId);
                const f = d.find((r) => r.id === nameOrId || r.name === nameOrId);
                if (!f) {
                    throw new Error(`Emoji (${nameOrId}) not found in ${clientId} client`);
                }
                this.cache.set(
                    d.filter((c) => c.id !== f.id),
                    clientId,
                );
                return this.cache;
            },
        };
    }

    #emoji(name: string, id: string, animated = false) {
        return { name, id, toString: () => `<${animated ? `a` : ""}:${name}:${id}>` };
    }

    public async fetch(cached = true) {
        const res = this.cache.get();
        if (cached && is.array(res)) {
            return res;
        }
        const r = (await this.rest.get(Routes.applicationEmojis(this.clientId)).catch(noop)) as { items: ApplicationEmoji[] } | null;
        if (r && is.array(r.items)) {
            const add = make.array<EmojiData[0]>();
            for (const c of r.items) {
                if (is.string(c.name) && is.string(c.id) && is.boolean(c.animated)) {
                    add.push(this.#emoji(c.name, c.id, c.animated));
                }
            }
            if (is.array(add)) {
                this.cache.set(add);
            }
            return add;
        }
        return [];
    }

    /** Creates an emoji then stores it in the cache */
    public async create(name: string, image: string | Buffer) {
        if (is.string(image) && image.match(/http(s)?:\/\//gi)) {
            const d = await resolveImage(image);
            if (!d) {
                throw new Error(`Couldn't resolve image.`);
            }
            image = d;
        }
        const res = (await this.rest.post(Routes.applicationEmojis(this.clientId), {
            body: { name, image },
        })) as RESTPostAPIApplicationEmojiResult;
        if (res && is.string(res.name) && is.string(res.id) && is.boolean(res.animated)) {
            this.cache.add(res.name, res.id, res.animated);
        }
        return res;
    }

    /** Will return no content */
    public async delete(id: string) {
        return await this.rest.delete(Routes.applicationEmoji(this.clientId, id)).catch(noop);
    }

    public async edit(id: string, name: string) {
        const res = (await this.rest
            .patch(Routes.applicationEmoji(this.clientId, id), {
                body: { name },
            })
            .catch(noop)) as RESTPatchAPIApplicationEmojiResult | null;
        if (res && is.string(res.name) && is.string(res.id) && is.boolean(res.animated)) {
            this.cache.remove(res.id);
            this.cache.add(res.name, res.id, res.animated);
            return res;
        }
        return null;
    }
}
