import {
    get,
    getKeys,
    getPackageStart,
    is,
    make,
    noop,
    resolveColor,
    sleep,
    snowflakes,
    status,
    XOR,
} from "@elara-services/utils";
import { DiscordWebhook, Webhook } from "@elara-services/webhooks";
import { EventEmitter } from "eventemitter3";
import { MongoClient, MongoClientOptions } from "mongodb";
import { name, version } from "../../package.json";
import { API } from "../api";
import type {
    FormattedStreamPost,
    PostViewed,
    SetStreamUserOption,
    StreamOptions,
    StreamUserOption,
    StreamUserOptional,
} from "../interfaces";
import { chunk, formatPost, transformText } from "../utils";
import { parse } from "../utils/parser";

export class Stream extends API {
    private stream = new EventEmitter();
    private cache = new Map<string, SetStreamUserOption>();
    /** Only needed for 'channels.channelId' options so the package can send announcements */
    #discordBotToken: string | undefined;
    private mongodb: MongoClient | null = null;
    public constructor(
        protected options: StreamOptions,
        discordBotToken?: string,
        mongoOptions?: XOR<
            MongoClient,
            { url: string; options?: MongoClientOptions; dbName?: string }
        >
    ) {
        super(options);
        this.#discordBotToken = discordBotToken;
        if (mongoOptions instanceof MongoClient) {
            this.mongodb = mongoOptions;
        } else if (mongoOptions && is.string(mongoOptions?.url)) {
            if (!is.string(mongoOptions.dbName)) {
                mongoOptions.dbName = "BlueSky";
            }
            this.mongodb = new MongoClient(
                mongoOptions?.url,
                mongoOptions?.options
            );
        }
    }

    private dbs(name = "users") {
        return this.mongodb?.db(this.mongodb.options.dbName).collection(name);
    }

    #getChannelData(handle: string, c: StreamUserOptional) {
        if (
            "channelId" in c &&
            is.string(c.channelId) &&
            !this.#discordBotToken
        ) {
            throw new Error(
                `[${name}, v${version}]: ERROR: (${handle}) includes a 'channelId' but no 'discordBotToken' was provided in the constructor!`
            );
        }
        if (!("guildId" in c) || !is.string(c.guildId)) {
            throw new Error(
                `${getPackageStart({
                    name,
                    version,
                })} ERROR (${handle}) doesn't include a 'guildId'`
            );
        }
        return {
            searchId: c.searchId || `${snowflakes.generate()}`,
            roles: c.roles || [],
            color:
                is.string(c.color) && c.color.startsWith("#")
                    ? c.color
                    : "#49acfe",
            showButtons: is.boolean(c.showButtons) ? c.showButtons : true,
            url: "url" in c ? c.url : null,
            channelId: "channelId" in c ? c.channelId : null,
            guildId: c.guildId,
            options: {
                username: is.string(c.options?.username)
                    ? c.options?.username || null
                    : null,
                avatar: is.string(c.options?.avatar)
                    ? c.options?.avatar || null
                    : null,
                content: is.string(c.options?.content)
                    ? c.options?.content || ""
                    : "",
                embeds: is.array(c.options?.embeds)
                    ? c.options?.embeds || []
                    : [],
                components: is.array(c.options?.components)
                    ? c.options?.components || []
                    : [],
            },
            toggles: {
                reposts: is.boolean(c.toggles?.reposts)
                    ? c.toggles?.reposts === false
                        ? false
                        : true
                    : true,
            },
        };
    }

    public get manage() {
        return {
            add: async (handles: StreamUserOption[] | StreamUserOption) => {
                if (!is.array(handles)) {
                    handles = [handles];
                }
                const dbs =
                    (await this.dbs()
                        ?.find()
                        .toArray()
                        .catch(() => [])) || [];
                for await (const u of handles) {
                    const data = {
                        handle: u.handle,
                        channels: is.array(u.channels)
                            ? u.channels?.map((c) => {
                                  return this.#getChannelData(u.handle, c);
                              })
                            : [],
                    };
                    if (this.mongodb) {
                        if (!dbs.find((c) => c.handle === u.handle)) {
                            await this.dbs()?.insertOne(data).catch(noop);
                        }
                    }
                    this.cache.set(data.handle, data);
                }
            },
            remove: async (handles: string[] | string) => {
                if (is.string(handles)) {
                    handles = [handles];
                }
                for (const u of handles) {
                    this.cache.delete(u);
                }
                await this.dbs()
                    ?.deleteMany({
                        handle: {
                            $in: handles,
                        },
                    })
                    .catch(noop);
            },

            get: async (
                handle: string
            ): Promise<SetStreamUserOption | null> => {
                const cache = this.cache.get(handle) || null;
                if (cache) {
                    return cache;
                }
                return (
                    ((await this.dbs()
                        ?.findOne({ handle })
                        .catch(noop)) as SetStreamUserOption | null) ?? null
                );
            },

            channels: {
                add: async (
                    handle: string,
                    options: Omit<StreamUserOptional, "searchId">
                ) => {
                    try {
                        let find = await this.manage.get(handle);
                        if (!find) {
                            await this.manage.add({ handle, channels: [] });
                            find = await this.manage.get(handle);
                        }
                        if (!find) {
                            return status.error(
                                `Unable to find (${handle}) in the users list.`
                            );
                        }
                        if (!is.string(options.guildId)) {
                            return status.error(
                                `You need to provide a guildId.`
                            );
                        }
                        let f: StreamUserOptional | undefined;
                        let msg: string;
                        if (is.string(options.channelId)) {
                            f = find.channels.find(
                                (c) => c.channelId === options.channelId
                            );
                            msg = `Channel (${options.channelId}) is already added to the list for ${handle}`;
                        } else if (is.string(options.url)) {
                            f = find.channels.find(
                                (c) => c.url === options.url
                            );
                            msg = `The webhook url is already added to the list for ${handle}`;
                        } else {
                            return status.error(
                                `You didn't include a channelId or webhook url`
                            );
                        }
                        if (f) {
                            return status.error(msg);
                        }
                        find.channels.push(
                            this.#getChannelData(handle, options)
                        );
                        await this.dbs()
                            ?.updateOne(
                                { handle },
                                { $set: { channels: find.channels } }
                            )
                            .catch(noop);
                        return status.success(
                            `Added to (${handle})'s channels list`
                        );
                    } catch (err: any) {
                        return status.error(
                            err?.message ??
                                err ??
                                "Unknown error while trying to add the channel."
                        );
                    }
                },

                remove: async (handle: string, searchId: string) => {
                    const find = await this.manage.get(handle);
                    if (!find) {
                        return status.error(
                            `Handle (${handle}) isn't being watched.`
                        );
                    }
                    const f = find.channels.find(
                        (c) => c.searchId === searchId
                    );
                    if (!f) {
                        return status.error(
                            `Handle (${handle}) doesn't have a (${searchId}) searchId`
                        );
                    }
                    find.channels = find.channels.filter(
                        (c) => c.searchId !== f.searchId
                    );
                    await this.dbs()
                        ?.updateOne(
                            { handle },
                            { $set: { channels: find.channels } }
                        )
                        .catch(noop);
                    return status.success(
                        `Channel (${f.searchId}) is now removed from ${handle}`
                    );
                },

                update: async (
                    handle: string,
                    searchId: string,
                    options: Partial<Omit<StreamUserOptional, "searchId">>
                ) => {
                    const find = await this.manage.get(handle);
                    if (!find) {
                        return status.error(
                            `Handle (${handle}) isn't being watched.`
                        );
                    }
                    const f = find.channels.find(
                        (c) => c.searchId === searchId
                    );
                    if (!f) {
                        return status.error(
                            `Handle (${handle}) doesn't have a (${searchId}) searchId`
                        );
                    }
                    const strs = ["channelId", "url", "color"] as const;
                    const arrays = ["roles"] as const;
                    const bools = ["showButtons"] as const;
                    const changes = make.array<string>();

                    for (const c of strs) {
                        if (is.string(options[c], false)) {
                            f[c] = options[c];
                            changes.push(c);
                        }
                    }
                    for (const c of arrays) {
                        if (is.array(options[c], false)) {
                            f[c] = options[c];
                            changes.push(c);
                        }
                    }
                    for (const c of bools) {
                        if (is.boolean(options[c])) {
                            f[c] = options[c];
                            changes.push(c);
                        }
                    }
                    if (is.object(options.options)) {
                        const arr = ["embeds", "components"] as const;
                        const st = ["username", "avatar", "content"] as const;
                        for (const c of arr) {
                            if (is.array(options.options[c], false)) {
                                // @ts-ignore
                                f.options[c] = options.options[c];
                                changes.push(`options.${c}`);
                            }
                        }
                        for (const c of st) {
                            if (is.string(options.options[c], false)) {
                                f.options[c] = options.options[c];
                                changes.push(`options.${c}`);
                            }
                        }
                    }

                    if (is.object(options.toggles)) {
                        for (const key of getKeys(options.toggles)) {
                            if (is.boolean(options.toggles[key])) {
                                f.toggles[key] = options.toggles[key];
                                changes.push(`toggles.${key}`);
                            }
                        }
                    }

                    if (!is.array(changes)) {
                        return status.error(`Nothing needed to be updated?`);
                    }
                    await this.dbs()
                        ?.updateOne(
                            { handle },
                            { $set: { channels: find.channels } }
                        )
                        .catch(noop);
                    return status.data({ changes });
                },

                clear: async (handle: string) => {
                    const find = await this.manage.get(handle);
                    if (!find) {
                        return status.error(
                            `Handle (${handle}) isn't being watched.`
                        );
                    }
                    const channels = [...find.channels];
                    find.channels = [];
                    await this.dbs()
                        ?.updateOne({ handle }, { $set: { channels: [] } })
                        .catch(noop);
                    return status.data({
                        message: `Cleared (${channels.length}) channels from ${handle}`,
                        archived: channels,
                    });
                },

                get: async (handle: string, searchId?: string) => {
                    const find = await this.manage.get(handle);
                    if (!find) {
                        return status.error(
                            `Handle (${handle}) isn't being watched.`
                        );
                    }
                    if (!is.array(find.channels)) {
                        return status.error(
                            `Handle (${handle}) has no channels added.`
                        );
                    }
                    if (is.string(searchId)) {
                        const f = find.channels.find(
                            (c) => c.searchId === searchId
                        );
                        if (!f) {
                            return status.error(
                                `Channel (${searchId}) wasn't found in ${handle}`
                            );
                        }
                        return status.data([f]);
                    }
                    return status.data(find.channels);
                },
            },

            clear: async (clearDB = false) => {
                this.cache.clear();
                if (clearDB && this.mongodb) {
                    const list = await this.manage.list();
                    if (is.array(list)) {
                        await this.dbs()
                            ?.deleteMany({
                                handle: { $in: list.map((c) => c.handle) },
                            })
                            .catch(noop);
                    }
                }
            },
            list: async (guildId?: string) => {
                if (this.mongodb) {
                    return (await this.dbs()
                        ?.find(guildId ? { guildId } : {})
                        .toArray()
                        .catch(() => [])) as SetStreamUserOption[];
                }
                return [...this.cache.values()];
            },

            update: {
                handle: async (oldHandle: string, newhandle: string) => {
                    const f = await this.manage.get(oldHandle);
                    if (!f) {
                        return status.error(
                            `Handle (${oldHandle}) isn't found in the system.`
                        );
                    }
                    f.handle = newhandle;
                    await this.dbs()
                        ?.updateOne(
                            { handle: oldHandle },
                            { $set: { handle: newhandle } }
                        )
                        .catch(noop);
                    return status.success(
                        `Handle (${oldHandle}) is now updated to ${newhandle}`
                    );
                },
            },

            set: async (
                user: string,
                searchId: string,
                options: Omit<StreamUserOptional, "searchId">
            ) => {
                if (!Object.keys(options).length) {
                    return status.error(
                        `You failed to provide any options to change.`
                    );
                }
                let data: SetStreamUserOption | undefined;
                if (this.mongodb) {
                    const f = (await this.dbs()
                        ?.findOne({ handle: user })
                        .catch(noop)) as SetStreamUserOption | null;
                    if (!f) {
                        return status.error(
                            `User (${user}) wasn't found in the database.`
                        );
                    }
                    data = f;
                } else {
                    data = this.cache.get(user);
                }
                if (!data) {
                    return status.error(
                        `User (${user}) wasn't found in the cache.`
                    );
                }
                const channel = data.channels.find(
                    (c) => c.searchId === searchId
                );
                if (!channel) {
                    return status.error(
                        `User (${user}) doesn't have (${searchId}) searchId`
                    );
                }
                const c = [];
                if (is.string(options.channelId)) {
                    channel.channelId = options.channelId;
                    c.push(`channelId`);
                }
                if (is.string(options.guildId)) {
                    channel.guildId = options.guildId;
                    c.push(`guildId`);
                }
                if (is.string(options.url)) {
                    channel.url = options.url;
                    c.push(`url`);
                }
                if (is.string(options.color)) {
                    channel.color = options.color;
                    c.push(`color`);
                }
                if (is.boolean(options.showButtons)) {
                    channel.showButtons = options.showButtons;
                    c.push(`showButtons`);
                }
                if (is.array(options.roles, false)) {
                    channel.roles = options.roles;
                    c.push(`roles`);
                }
                if (is.boolean(options.toggles?.reposts)) {
                    channel.toggles.reposts = options.toggles?.reposts ?? false;
                    c.push(`toggles.reposts`);
                }
                if (is.object(options.options)) {
                    if (is.string(options.options.content, false)) {
                        channel.options.content = options.options.content;
                        c.push(`options.content`);
                    }
                    if (is.string(options.options.username, false)) {
                        channel.options.username = options.options.username;
                        c.push(`options.username`);
                    }
                    if (is.string(options.options.avatar, false)) {
                        channel.options.avatar = options.options.avatar;
                        c.push(`options.avatar`);
                    }
                    if (is.array(options.options.components, false)) {
                        channel.options.components = options.options.components;
                        c.push(`options.components`);
                    }
                    if (is.array(options.options.embeds, false)) {
                        channel.options.embeds = options.options.embeds;
                        c.push(`options.embeds`);
                    }
                }
                if (!is.array(c)) {
                    return status.error(`Nothing needed to be updated.`);
                }
                if (this.mongodb) {
                    // @ts-ignore
                    if (data._id) {
                        // @ts-ignore
                        delete data._id;
                    }
                    await this.dbs()
                        ?.updateOne({ handle: user }, data)
                        .catch(noop);
                }
                return status.data({
                    user: data,
                    channel,
                });
            },
        };
    }

    get #name() {
        return `BlueSky`;
    }

    get #icon() {
        return make.emojiURL(`1187876658355638372`);
    }

    get #mins() {
        return get.mins(this.options.searchMinutes || 1);
    }

    public onPost(
        listener: (
            user: SetStreamUserOption,
            post: PostViewed,
            format: FormattedStreamPost
        ) => void
    ) {
        return this.stream.on("post", listener);
    }

    public onDebug(listener: (...args: unknown[]) => void) {
        return this.stream.on("debug", listener);
    }

    public async start(): Promise<unknown> {
        const users = await this.manage.list();
        if (!is.array(users)) {
            this.#debug(
                `[STREAM]: Ignoring, no users in the list, trying again in ${
                    this.#mins
                } minute(s)`
            );
            return this.#run();
        }
        // @ts-ignore
        await this.agent();
        for await (const c of chunk(users, 25)) {
            this.#debug(
                `[STREAM:CHECK]: Checking (${c.length}) users for new posts.`
            );
            const feeds = await this.users.feeds.fetchMultiple(
                c.map((c) => c.handle),
                {
                    checkAgainstTime: this.#mins,
                    limit: 20,
                }
            );
            if (feeds.status) {
                this.#debug(
                    `[STREAM:CHECK]: Found (${feeds.data.size}) users with new posts.`
                );
                for (const [name, data] of feeds.data) {
                    const user = users.find((c) => c.handle === name);
                    if (!user || !is.array(data)) {
                        continue;
                    }
                    for (const post of data) {
                        this.stream.emit("post", user, post, formatPost(post));
                        if (is.array(user.channels)) {
                            // @ts-ignore
                            this.#handlePost(
                                user,
                                formatPost(post),
                                post.post as PostViewed
                            );
                        }
                    }
                }
            } else {
                this.#debug(`[STREAM:CHECK]: No new posts by any users.`);
            }
        }
        return this.#run();
    }

    async #handlePost(
        user: SetStreamUserOption,
        post: FormattedStreamPost,
        viewed: PostViewed
    ): Promise<unknown> {
        const send = async (webhook: SetStreamUserOption["channels"][0]) => {
            if (
                !webhook.toggles.reposts &&
                post.reposted &&
                post.type === "repost"
            ) {
                return;
            }
            const opts: {
                content: string;
                embeds: SetStreamUserOption["channels"][0]["options"]["embeds"];
                components: SetStreamUserOption["channels"][0]["options"]["components"];
                username: string;
                avatar_url: string;
            } = {
                content: "",
                embeds: [],
                components: [],
                username:
                    webhook.options.username ||
                    post.author.username ||
                    this.#name,
                avatar_url:
                    webhook.options.avatar || post.author.avatar || this.#icon,
            };
            let noContent = false;
            if (is.array(webhook.roles)) {
                opts.content = webhook.roles.map((c) => `<@&${c}>`).join(" ");
            }
            post.text = transformText(viewed);
            if (
                is.string(webhook.options.content) ||
                is.array(webhook.options.embeds) ||
                is.array(webhook.options.components)
            ) {
                let isThereContent = false;
                const options = parse(webhook.options, post);
                if (is.string(options.content)) {
                    if (is.string(opts.content)) {
                        opts.content =
                            `${opts.content}, ${options.content}`.slice(
                                0,
                                2000
                            );
                    } else {
                        opts.content = options.content;
                    }
                    isThereContent = true;
                }
                if (is.array(options.embeds)) {
                    isThereContent = true;
                    opts.embeds = options.embeds;
                }
                if (is.array(options.components)) {
                    isThereContent = true;
                    opts.components = options.components;
                }
                noContent = isThereContent;
            }
            if (!noContent) {
                const embed = {
                    author: { name: this.#name, icon_url: this.#icon },
                    title: `${post.author.username} (\`${post.author.handle}\`)`,
                    url: post.links.url,
                    description: is.string(post.text)
                        ? post.text.slice(0, 4000)
                        : "",
                    color: resolveColor(webhook.color),
                    image: post.images.length
                        ? { url: post.images[0] }
                        : undefined,
                    timestamp: post.createdAt,
                    thumbnail: { url: post.author.avatar || this.#icon },
                };
                if (post.type === "repost" && post.reposted) {
                    opts.username = post.reposted.user.username;
                    opts.avatar_url = post.reposted.user.avatar;
                    embed.color = 0x62f84a;
                    embed.timestamp = post.reposted.createdAt;
                }
                opts.embeds.push(embed);
                if (post.images.length > 1) {
                    for (const img of post.images.slice(1)) {
                        opts.embeds.push({
                            url: post.links.url,
                            image: { url: img },
                        });
                    }
                }
                if (webhook.showButtons) {
                    opts.components.push({
                        type: 1,
                        components: [
                            {
                                type: 2,
                                style: 5,
                                url: post.links.url,
                                label: `View${post.reposted ? ` Repost` : ""}`,
                            },
                        ],
                    });
                }
            }
            if (is.string(webhook.url)) {
                const hook = new DiscordWebhook(webhook.url, {
                    username: opts.username,
                    avatar_url: opts.avatar_url,
                });
                if (is.string(opts.content)) {
                    hook.content(opts.content);
                }
                if (is.array(opts.embeds)) {
                    hook.embeds(opts.embeds);
                }
                if (is.array(opts.components)) {
                    // @ts-ignore
                    hook.buttons(opts.components);
                }
                await hook.send().catch(console.error);
            }
            if (
                is.string(webhook.channelId) &&
                is.string(this.#discordBotToken)
            ) {
                await new Webhook(this.#discordBotToken)
                    .send(
                        webhook.channelId,
                        {
                            // @ts-ignore
                            components: opts.components,
                            content: opts.content,
                            // @ts-ignore
                            embeds: opts.embeds,
                            webhook: {
                                name: opts.username,
                                icon: opts.avatar_url,
                            },
                        },
                        false,
                        false
                    )
                    .catch(console.error);
            }
            return;
        };
        for await (const c of chunk(user.channels, 4)) {
            await Promise.all(c.map((r) => send(r)));
            await sleep(get.secs(1));
        }
        return;
    }

    #run() {
        return setTimeout(() => this.start(), this.#mins);
    }

    #debug(...args: unknown[]) {
        this.stream.emit("debug", ...args);
        // @ts-ignore
        this.debug(...args);
    }
}
