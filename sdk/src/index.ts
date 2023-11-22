import { fetch } from "@elara-services/fetch";
import type {
    AllTime,
    AutoModImages,
    AutoModLinks,
    AutoModWords,
    BlacklistListAll,
    BlacklistToggle,
    BlacklistUser,
    BlacklistUserAll,
    DBLBotGet,
    DBLUserGet,
    DJSDocs,
    EightBall,
    Fact,
    Facts,
    HasteGet,
    HasteOptions,
    HastePost,
    IMDBMovie,
    IMDBShow,
    Image,
    Lyrics,
    Math,
    NPM,
    PasteGet,
    PastePost,
    Picarto,
    Ping,
    Response,
    RobloxGroup,
    RobloxUser,
    Status,
    Time,
    Translate,
    YTStats,
} from "./interfaces";
import { links, status, userAgent, routes } from "./utils";
export * from "./interfaces";

export class SDK {
    #key: string = "";
    #baseURL: string = links.base;

    public constructor(key?: string, baseURL?: string) {
        if (key) {
            if (typeof key !== "string") {
                throw new Error(`The API key you provided isn't a string!`);
            }
            this.#key = key;
        }
        if (baseURL) {
            this.#baseURL = baseURL;
        }
    }

    public get support() {
        return links.support;
    }

    public get docs() {
        return links.docs;
    }

    private async fetch<D extends object, S = void>(
        url: string,
        send?: S,
        useKey = true,
        useBase = true,
    ): Promise<D | null> {
        try {
            const res = await fetch(`${useBase ? this.#baseURL : ""}${url}`)
                .header({
                    key: useKey ? this.#key : "",
                    "User-Agent": userAgent,
                })
                .body(send, "json")
                .send();
            return res.json() as D;
        } catch (err: unknown) {
            console.log(err);
            return null;
        }
    }

    public async ping(): Response<Ping> {
        const res = await this.fetch<Ping>(routes.ping);
        return res ?? status(`I was unable to fetch the site ping.`);
    }

    public get haste() {
        return {
            get: async (id: string, url = links.haste): Response<HasteGet> => {
                try {
                    if (!id) {
                        return status(`You didn't provide a paste ID!`);
                    }
                    const body = await this.fetch<{
                        key: string;
                        data: string;
                    }>(`${url}/documents/${id}`, undefined, false, false);
                    if (!body) {
                        return status(`No response from the hastebin website.`);
                    }
                    return {
                        status: true,
                        id: body.key,
                        content: body.data,
                        key: `${url}/${body.key}`,
                    };
                } catch (err) {
                    return status(err);
                }
            },
            post: async (
                content: string,
                options: HasteOptions | string = {},
            ): Response<HastePost> => {
                try {
                    if (typeof options === "string") {
                        options = {
                            url: links.haste,
                            extension: options,
                        };
                    }
                    const url = "url" in options ? options.url : links.haste;
                    const extension =
                        "extension" in options ? options.extension : "js";
                    if (!content) {
                        return status(`You didn't provide any content!`);
                    }
                    const res = await fetch(`${url}/documents`, "POST")
                        .header("User-Agent", userAgent)
                        .header("Content-Type", "text/plain")
                        .body(content, "text")
                        .send()
                        .catch(() => ({ statusCode: 500, json: () => null }));
                    if (res.statusCode !== 200) {
                        return status(`No response from the hastebin website.`);
                    }
                    const body = res.json<{ key: string }>();
                    if (!body) {
                        throw new Error(
                            `Unable to create a new haste document.`,
                        );
                    }
                    return {
                        status: true,
                        id: body.key,
                        url: `${url}/${body.key}.${extension}`,
                    };
                } catch (err) {
                    return status(err);
                }
            },
        };
    }

    public get paste() {
        return {
            get: async (id: string): Response<PasteGet> => {
                try {
                    if (!id) {
                        return status(`You didn't provide a paste ID.`);
                    }
                    const res = await this.fetch<PasteGet>(routes.bin.get(id));
                    return res ?? status(`No response from the Pastebin API`);
                } catch (err) {
                    return status(err);
                }
            },
            post: async (
                title: string | null,
                content: string,
                privatePaste = false,
            ): Response<PastePost> => {
                try {
                    if (!content) {
                        return status(
                            `You didn't provide any content to post to the pastebin API`,
                        );
                    }
                    if (typeof privatePaste !== "boolean") {
                        privatePaste = false;
                    }
                    const res = await fetch(
                        `${this.#baseURL}${routes.bin.post}`,
                        "POST",
                    )
                        .header({
                            key: this.#key,
                            "User-Agent": userAgent,
                        })
                        .body(
                            {
                                content,
                                title,
                                priv: privatePaste,
                            },
                            "json",
                        )
                        .send()
                        .catch(() => ({ statusCode: 500, json: () => null }));
                    if (res.statusCode !== 200) {
                        return status(`No response from the pastebin.`);
                    }
                    const body = res.json<PastePost>();
                    if (!body) {
                        return status(`No response from the Pastebin API!`);
                    }
                    return body;
                } catch (err) {
                    return status(err);
                }
            },
        };
    }

    public get api() {
        return {
            dbl: {
                get: async (
                    token: string,
                    id: string,
                ): Response<DBLBotGet | DBLUserGet> => {
                    try {
                        if (!token) {
                            return status(
                                `You didn't provide a Discord Bot List(top.gg) token!`,
                            );
                        }
                        if (!id) {
                            return status(
                                `You didn't provide a Discord Bot or User ID`,
                            );
                        }
                        const res = await this.fetch<DBLBotGet | DBLUserGet>(
                            routes.dbl.get(token, id),
                        );
                        return (
                            res ??
                            status(
                                `Unknown error while trying to fetch the image from the API`,
                            )
                        );
                    } catch (err) {
                        return status(err);
                    }
                },

                post: async (
                    token: string,
                    id: string,
                    servers: number,
                    shards = 0,
                ): Promise<Status> => {
                    try {
                        if (!token) {
                            return status(
                                `You didn't provide a Discord Bot List(top.gg) token!`,
                            );
                        }
                        if (!id) {
                            return status(
                                `You didn't provide a Discord Bot or User ID`,
                            );
                        }
                        if (!servers) {
                            return status(
                                `You didn't provide 'servers' number!`,
                            );
                        }
                        if (isNaN(servers)) {
                            return status(
                                `The 'servers' number value isn't valid!`,
                            );
                        }
                        if (isNaN(shards)) {
                            return status(
                                `The 'shards' number value isn't valid!`,
                            );
                        }
                        const res = await this.fetch<Status>(
                            routes.dbl.post(token, id, shards, servers),
                        );
                        return (
                            res ??
                            status(
                                `Unknown error while trying to post the stats to DBL(top.gg)`,
                            )
                        );
                    } catch (err) {
                        return status(err);
                    }
                },
            },

            lyrics: async (name: string): Response<Lyrics> => {
                try {
                    const res = await this.fetch<Lyrics>(
                        routes.api.lyrics(name),
                    );
                    return res ?? status(`No response from the lyrics API.`);
                } catch (err) {
                    return status(err);
                }
            },

            photos: async (image: string): Response<Image> => {
                try {
                    if (!image) {
                        return status(
                            `You didn't provide an image endpoint, ex: 'cats', 'pugs', 'dogs'`,
                        );
                    }
                    const res = await this.fetch<Image>(
                        routes.api.photos(image),
                    );
                    return (
                        res ??
                        status(
                            `Unknown error while trying to fetch the image from the API`,
                        )
                    );
                } catch (err) {
                    return status(err);
                }
            },

            math: async (problem: number): Response<Math> => {
                try {
                    if (!problem) {
                        return status(`You didn't provide a math problem`);
                    }
                    const res = await this.fetch<Math, { problem: number }>(
                        routes.api.math,
                        { problem },
                    );
                    return (
                        res ??
                        status(
                            `Unknown error while trying to fetch the math problem from the API`,
                        )
                    );
                } catch (err) {
                    return status(err);
                }
            },

            special: async (image: string): Response<Image> => {
                try {
                    if (!image) {
                        return status(`You didn't provide an special endpoint`);
                    }
                    const res = await this.fetch<Image>(
                        routes.api.special(image),
                    );
                    return (
                        res ??
                        status(
                            `Unknown error while trying to fetch the image from the API`,
                        )
                    );
                } catch (err) {
                    return status(err);
                }
            },

            translate: async (
                to: string,
                text: string,
            ): Response<Translate> => {
                try {
                    if (!to) {
                        return status(`You didn't provide the 'to' language!`);
                    }
                    if (!text) {
                        return status(`You didn't provide any text!`);
                    }
                    const res = await this.fetch<
                        Translate,
                        {
                            to: string;
                            text: string;
                        }
                    >(routes.api.translate, {
                        to,
                        text,
                    });
                    return (
                        res ??
                        status(
                            `Unknown error while trying to fetch the translation from the API`,
                        )
                    );
                } catch (err) {
                    return status(err);
                }
            },

            facts: async (type = "random"): Response<Fact | Facts> => {
                try {
                    const res = await this.fetch<Fact | Facts>(
                        routes.api.facts(type),
                    );
                    return (
                        res ??
                        status(
                            `Unknown error while trying to fetch the fact(s) from the API`,
                        )
                    );
                } catch (err) {
                    return status(err);
                }
            },

            memes: async (clean = false): Response<Image> => {
                try {
                    if (![true, false].includes(clean)) {
                        return status(
                            `The 'clean' you provided is invalid, it has to be a boolean.`,
                        );
                    }
                    const res = await this.fetch<Image>(
                        routes.api.memes(clean),
                    );
                    return res ?? status(`I was unable to fetch the meme :(`);
                } catch (err) {
                    return status(err);
                }
            },

            ball: async (): Response<EightBall> => {
                try {
                    const res = await this.fetch<EightBall>(routes.api.ball);
                    return (
                        res ??
                        status(
                            `Unknown error while trying to fetch 8ball from the API`,
                        )
                    );
                } catch (err) {
                    return status(err);
                }
            },

            npm: async (name: string): Response<NPM> => {
                try {
                    if (!name) {
                        return status(`You didn't provide a npm package name!`);
                    }
                    const res = await this.fetch<NPM>(routes.api.npm(name));
                    return (
                        res ??
                        status(
                            `Unable to fetch the npm package from the API site!`,
                        )
                    );
                } catch (err) {
                    return status(err);
                }
            },

            time: async (
                place: string,
                all = false,
            ): Response<Time | AllTime> => {
                try {
                    if (typeof all !== "boolean") {
                        return status(`'all' isn't a boolean!`);
                    }
                    if (all === true) {
                        const res = await this.fetch<AllTime>(
                            routes.api.time.all,
                        );
                        return res ?? status(`Unable to fetch the times list!`);
                    }
                    if (!place) {
                        return status(`You didn't provide a place!`);
                    }
                    const res = await this.fetch<Time>(
                        routes.api.time.place(place),
                    );
                    return (
                        res ?? status(`Unable to fetch the info for ${place}`)
                    );
                } catch (err) {
                    return status(err);
                }
            },

            docs: async (
                search: string,
                project = "stable",
                branch = "stable",
            ): Response<DJSDocs> => {
                try {
                    if (!search) {
                        return status(
                            `Well tell me what you want to search for?`,
                        );
                    }
                    const res = await this.fetch<DJSDocs>(
                        routes.api.docs(search, project, branch),
                    );
                    return (
                        res ??
                        status(`I was unable to fetch the docs infomration`)
                    );
                } catch (err) {
                    return status(err);
                }
            },

            platform: {
                ytstats: async (
                    token: string,
                    IDOrName: string,
                ): Response<YTStats> => {
                    try {
                        if (!token) {
                            return status(
                                `You didn't provide a youtube API key`,
                            );
                        }
                        if (!IDOrName) {
                            return status(
                                `You didnt provide a channel ID or name!`,
                            );
                        }
                        const res = await this.fetch<YTStats>(
                            routes.platform.ytstats(IDOrName, token),
                        );
                        return (
                            res ??
                            status(
                                `Unable to fetch the ytstats information from the API site`,
                            )
                        );
                    } catch (err) {
                        return status(err);
                    }
                },
                roblox: async (id: string): Response<RobloxUser> => {
                    try {
                        if (!id) {
                            return status(
                                `You didn't provide a Discord user ID`,
                            );
                        }
                        const res = await this.fetch<RobloxUser>(
                            routes.platform.roblox(id, false),
                        );
                        return (
                            res ??
                            status(
                                `Unable to fetch the roblox information from the API site`,
                            )
                        );
                    } catch (err) {
                        return status(err);
                    }
                },
                robloxgroup: async (id: string): Response<RobloxGroup> => {
                    try {
                        if (!id) {
                            return status(
                                `You didn't provide a roblox group ID`,
                            );
                        }
                        const res = await this.fetch<RobloxGroup>(
                            routes.platform.roblox(id, true),
                        );
                        return (
                            res ??
                            status(
                                `Unable to fetch the roblox group information from the API site`,
                            )
                        );
                    } catch (err) {
                        return status(err);
                    }
                },
                fortnite: async (
                    token: string,
                    name: string,
                    platform = "pc",
                ) => {
                    try {
                        if (!token) {
                            return status(
                                `You didn't provide a Fortnite API key`,
                            );
                        }
                        if (!name) {
                            return status(`You didn't provide a username!`);
                        }
                        if (!platform) {
                            platform = "pc";
                        }
                        const res = await this.fetch(
                            routes.platform.fortnite(name, token, platform),
                        );
                        return (
                            res ??
                            status(
                                `Unable to fetch the fortnite information from the API site`,
                            )
                        );
                    } catch (err) {
                        return status(err);
                    }
                },
                imdb: async (
                    token: string,
                    show: string,
                ): Response<IMDBShow | IMDBMovie> => {
                    try {
                        if (!token) {
                            return status(
                                `You didn't provide a 'imdb' API key!`,
                            );
                        }
                        if (!show) {
                            return status(
                                `You didn't provide the tv-show or movie name!`,
                            );
                        }
                        const res = await this.fetch<IMDBMovie | IMDBShow>(
                            routes.platform.imdb(show, token),
                        );
                        return (
                            res ??
                            status(
                                `Unable to fetch the imdb information, try again later.`,
                            )
                        );
                    } catch (err) {
                        return status(err);
                    }
                },
                ytsearch: async (
                    token: string,
                    name: string,
                    type = "video",
                ) => {
                    try {
                        if (!token) {
                            return status(
                                `You didn't provide a 'imdb' API key!`,
                            );
                        }
                        if (!name) {
                            return status(
                                `You didn't provide the name to search for!`,
                            );
                        }
                        if (!type) {
                            type = "video";
                        }
                        const res = await this.fetch(
                            routes.platform.ytsearch(name, type, token),
                        );
                        return (
                            res ??
                            status(
                                `Unable to fetch the ytsearch information, try again later.`,
                            )
                        );
                    } catch (err) {
                        return status(err);
                    }
                },
                picarto: async (nameOrID: string): Response<Picarto> => {
                    try {
                        if (!nameOrID) {
                            return status(
                                `You didn't provide a Picarto ID or name`,
                            );
                        }
                        const res = await this.fetch<Picarto>(
                            routes.platform.picarto(nameOrID),
                        );
                        return (
                            res ??
                            status(
                                `Unable to fetch the Picarto information, try again later.`,
                            )
                        );
                    } catch (err) {
                        return status(err);
                    }
                },
            },
        };
    }

    public get automod() {
        return {
            images: async (
                token: string,
                urls: string[] = [],
                percent = 89,
            ): Response<AutoModImages> => {
                try {
                    if (!token) {
                        return status(
                            `You didn't provide a moderatecontent API Key!`,
                        );
                    }
                    if (!Array.isArray(urls)) {
                        return status(
                            `The "urls" you provided wasn't an array!`,
                        );
                    }
                    if (!urls.length) {
                        return status(`You didn't provide images to check!`);
                    }
                    const res = await this.fetch<
                        AutoModImages,
                        { images: string[] }
                    >(routes.automod.images(token, percent), { images: urls });
                    return (
                        res ??
                        status(
                            `Unknown error while trying to fetch the imagemod information from the API`,
                        )
                    );
                } catch (err) {
                    return status(err);
                }
            },
            words: async (
                message: string,
                words: string[] = [],
                emojis: string[] = [],
            ): Response<AutoModWords> => {
                try {
                    if (!message || !message.toString().length) {
                        return status(`You didn't provide a message`);
                    }
                    const res = await this.fetch<
                        AutoModWords,
                        { message: string; words: string[]; emojis: string[] }
                    >(routes.automod.words, {
                        message,
                        words,
                        emojis,
                    });
                    return (
                        res ?? status(`I was unable to fetch the API response`)
                    );
                } catch (err) {
                    return status(err);
                }
            },
            links: async (
                message: string,
                options: { prefix: string | null; regexp: boolean } = {
                    prefix: null,
                    regexp: true,
                },
            ): Response<AutoModLinks> => {
                try {
                    if (!message || !message.toString().length) {
                        return status(`You didn't provide a message.`);
                    }
                    const res = await this.fetch<
                        AutoModLinks,
                        {
                            message: string;
                            regexp: boolean;
                            prefix: string | null;
                        }
                    >(routes.automod.links, {
                        message,
                        regexp: options.regexp,
                        prefix: options.prefix,
                    });
                    return (
                        res ?? status(`I was unable to fetch the API response`)
                    );
                } catch (err) {
                    return status(err);
                }
            },
        };
    }

    public get dev() {
        return {
            blacklists: {
                servers: async (
                    id = "all",
                    type = "list",
                    data = { name: "", reason: "", mod: "" },
                ): Response<BlacklistListAll | Status | BlacklistToggle> => {
                    try {
                        if (!id) {
                            return status(
                                `You didn't provide a Discord server ID!`,
                            );
                        }
                        switch (type.toLowerCase()) {
                            case "add": {
                                const res = await this.fetch<BlacklistToggle>(
                                    routes.dev.blacklist.servers.toggle({
                                        id,
                                        action: type,
                                        ...data,
                                    }),
                                );
                                return (
                                    res ??
                                    status(
                                        `I was unable to add the server to the blacklisted database!`,
                                    )
                                );
                            }
                            case "delete":
                            case "remove": {
                                const res = await this.fetch<BlacklistToggle>(
                                    routes.dev.blacklist.servers.toggle({
                                        id,
                                        action: type,
                                        ...data,
                                    }),
                                );
                                return (
                                    res ??
                                    status(
                                        `I was unable to remove the server to the blacklisted database!`,
                                    )
                                );
                            }
                            case "list": {
                                const res = await this.fetch<BlacklistListAll>(
                                    routes.dev.blacklist.servers.list(id),
                                );
                                return (
                                    res ??
                                    status(
                                        `I was unable to fetch the blacklisted servers.`,
                                    )
                                );
                            }
                        }
                    } catch (err) {
                        return status(err);
                    }
                    return status(`You provided an invalid type.`);
                },
                users: async (
                    id = "all",
                    type = "list",
                    data = { username: "", tag: "", reason: "", mod: "" },
                ): Response<BlacklistUser | BlacklistUserAll | Status> => {
                    try {
                        if (!id) {
                            return status(
                                `You didn't provide a Discord user ID!`,
                            );
                        }
                        switch (type.toLowerCase()) {
                            case "add": {
                                const res = await this.fetch<BlacklistUser>(
                                    routes.dev.blacklist.users.toggle({
                                        id,
                                        action: "add",
                                        ...data,
                                    }),
                                );
                                return (
                                    res ??
                                    status(
                                        `I was unable to add the user to the blacklisted database!`,
                                    )
                                );
                            }
                            case "delete":
                            case "remove": {
                                const res = await this.fetch<BlacklistUser>(
                                    routes.dev.blacklist.users.toggle({
                                        id,
                                        action: "remove",
                                        ...data,
                                    }),
                                );
                                return (
                                    res ??
                                    status(
                                        `I was unable to remove the user to the blacklisted database!`,
                                    )
                                );
                            }
                            case "list": {
                                const res = await this.fetch<BlacklistUserAll>(
                                    routes.dev.blacklist.users.list(id),
                                );
                                return (
                                    res ??
                                    status(
                                        `I was unable to fetch the blacklisted users.`,
                                    )
                                );
                            }
                        }
                    } catch (err) {
                        return status(err);
                    }
                    return status(`You provided an invalid type.`);
                },
            },
        };
    }
}
