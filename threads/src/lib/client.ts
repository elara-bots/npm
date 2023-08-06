import "dotenv/config";

import { field, is, ms, resolveColor } from "@elara-services/utils";
import {
    DiscordWebhook,
    sendOptions,
    type DiscordWebhookData,
} from "@elara-services/webhooks";
import { EventEmitter } from "events";
import type { ThreadItem } from "threads-api";
import { name, version } from "../../package.json";
import * as API from "./api";
import { format, type FormatPost } from "./format";

export interface ThreadOptions {
    defaultAnnouncements?: boolean;
    debug?: boolean;
    interval?: number;
}

export interface User {
    name: string;
    id: string;
    full_name?: string | null;
    roleMentions?: string[];
    webhooks?: string[];
    color?: string | number;
    ignoreText?: string[];
    useLinkButton?: boolean;
}

const defaultInterval = 3 * 60000;
export class Client extends EventEmitter {
    private defaultAnnouncements: boolean;
    private debug: boolean;
    private interval: number;
    public api: typeof API;
    public data: User[];
    public constructor({
        defaultAnnouncements = true,
        debug = false,
        interval = defaultInterval,
    }: ThreadOptions) {
        super();
        this.defaultAnnouncements = is.boolean(defaultAnnouncements)
            ? defaultAnnouncements
            : true;
        this.debug = is.boolean(debug) ? debug : false;
        this.interval = is.number(interval) ? interval : defaultInterval;
        this.api = API;
        this.data = [];
    }

    private _debug(...args: unknown[]) {
        if (!this.debug) {
            return;
        }
        console.log(`[${name}, v${version}]: `, ...args);
    }

    public async fetchUser(search: string, isUserId = false) {
        let userId: string | null = search;
        if (!isUserId) {
            userId = await this.api.fetchUserIdByName(search);
        }
        if (!userId) {
            throw new Error(`Unable to find the user ID for ${search}`);
        }
        return await this.api.fetchUser(userId);
    }

    public async bulkFetchUserIds(search: string[]) {
        return this.api.bulkFetchUsersIdsByName(search);
    }

    public addUser({
        name,
        id,
        full_name,
        webhooks,
        color,
        ignoreText,
        useLinkButton,
        roleMentions,
    }: User) {
        if (this.data.find((c) => c.id === id)) {
            return this;
        }
        if (!is.string(name) || !is.string(id)) {
            this._debug(`There was no name or ID for an entry.`, name, id);
            return this;
        }
        this.data.push({
            name,
            id,
            full_name: is.string(full_name) ? full_name : null,
            roleMentions: is.array(roleMentions) ? roleMentions : [],
            color: is.string(color)
                ? color
                : is.number(color)
                ? color
                : 0xcd08eb,
            webhooks: is.array(webhooks) ? webhooks : [],
            ignoreText: is.array(ignoreText) ? ignoreText : [],
            useLinkButton: is.boolean(useLinkButton) ? useLinkButton : true,
        });
        return this;
    }

    public addUsers(users: User[]) {
        if (!is.array(users)) {
            return this;
        }
        for (const user of users) {
            this.addUser(user);
        }
        return this;
    }

    public async sendDefault(user: User, post: FormatPost) {
        if (
            !this.defaultAnnouncements ||
            !user ||
            !post ||
            !is.array(user.webhooks)
        ) {
            return;
        }
        let reposted = false;
        const author = post.user;
        if (post.posts.reposted) {
            reposted = true;
            post = post.posts.reposted;
        }
        const fields = [];
        if (!reposted && post.posts.repliedTo) {
            fields.push(
                field(
                    `Replied To`,
                    `[${post.posts.repliedTo.replace(
                        /_/g,
                        " "
                    )}](https://threads.net/@${post.posts.repliedTo})`
                )
            );
        }
        const embeds: DiscordWebhookData["embeds"] = [];
        const embed: DiscordWebhookData["embeds"]["0"] = {
            url: post.url,
            description: post.content || "",
            color: resolveColor(user.color || 0xcd08eb),
            thumbnail: { url: post.user.avatar },
            timestamp: post.created.iso,
            title:
                post.user.username === user.name
                    ? `${
                          user.full_name
                              ? `${user.full_name} (\`${post.user.username}\`)`
                              : post.user.username
                      }`
                    : post.user.username,
            fields: user.useLinkButton
                ? fields
                : [
                      ...fields,
                      {
                          name: `\u200b`,
                          value: `[View Thread](${post.url} "Click here to view the thread!")`,
                      },
                  ],
            author: {
                name: `Threads`,
                icon_url: `https://cdn.discordapp.com/emojis/1134690933045203034.png?v=1`,
                url: post.url,
            },
        };

        if (!reposted && is.object(post.posts.quoted) && post.posts.quoted) {
            const p = post.posts.quoted;
            embeds.push({
                author: {
                    name: `Quoted Thread`,
                    icon_url: `https://cdn.discordapp.com/attachments/1019820076813271040/1134805426844741662/1087220413001629796_threads.png`,
                },
                color: 0xda34c6,
                timestamp: p.created.iso,
                url: p.url,
                title: p.user.username,
                description: p.content || "",
                image: is.array(p.images) ? { url: p.images[0] } : undefined,
                thumbnail: { url: p.user.avatar },
                fields: user.useLinkButton
                    ? []
                    : [
                          {
                              name: `\u200b`,
                              value: `[View Thread](${p.url} "Click here to view the thread!")`,
                          },
                      ],
            });
        }

        if (is.array(post.images)) {
            if (is.array(post.images)) {
                if (post.images.length === 1) {
                    embeds.push({ ...embed, image: { url: post.images[0] } });
                } else {
                    embeds.push({ ...embed, image: { url: post.images[0] } });
                    for (const img of post.images.slice(1, 4)) {
                        embeds.push({ url: post.url, image: { url: img } });
                    }
                }
            }
        }
        embeds.push(embed);
        const getData = (webhook: string) => ({
            webhook,
            content: is.array(user.roleMentions)
                ? user.roleMentions.map((c) => `<@&${c}>`).join(", ")
                : undefined,
            username: `${(user.full_name || author.username).replace(
                /discord/gi,
                "𝖽𝗂𝗌𝖼𝗈𝗋𝖽"
            )}${reposted ? ` (Reposted)` : ""}`,
            avatar_url: author.avatar,
            embeds,
            components: user.useLinkButton
                ? [
                      {
                          type: 1,
                          components: [
                              {
                                  type: 2,
                                  style: 5,
                                  url: post.url,
                                  label: "View Thread",
                                  emoji: { id: "1134690933045203034" },
                              },
                              is.object(post.posts.quoted) &&
                              is.string(post.posts.quoted?.url)
                                  ? {
                                        type: 2,
                                        style: 5,
                                        url: post.posts.quoted.url,
                                        label: "View Quoted Thread",
                                        emoji: { id: "1134690933045203034" },
                                    }
                                  : null,
                          ].filter((c) => c),
                      },
                  ]
                : undefined,
        });
        // @ts-expect-error
        await Promise.all(user.webhooks.map((c) => this.send(getData(c))));
        return Promise.resolve(`Sending the announcements`);
    }

    public async send({
        webhook,
        components,
        content,
        embeds,
        username,
        avatar_url,
    }: sendOptions & {
        webhook: string | string[];
        username?: string;
        avatar_url?: string;
    }) {
        const sendWebhook = (hook: string) => {
            const web = new DiscordWebhook(hook, { username, avatar_url });

            if (is.array(components)) {
                web.buttons(components as any);
            }

            if (is.string(content)) {
                web.content(content);
            }

            if (is.array(embeds)) {
                web.embeds(embeds as DiscordWebhookData["embeds"]);
            }
            return web.send().catch((err) => {
                if (!err || !err.stack) {
                    return null;
                }
                this.emit(`webhook:error`, err);
            });
        };
        if (is.array(webhook)) {
            return await Promise.all(webhook.map((c) => sendWebhook(c)));
        }
        return sendWebhook(webhook);
    }

    public onPost(
        listener: (
            user: User,
            post: FormatPost,
            rawPost?: ThreadItem
        ) => Promise<unknown> | unknown
    ) {
        return this.on("post", listener);
    }

    public onDebug(
        listener: (...args: unknown[]) => Promise<unknown> | unknown
    ) {
        return this.on("debug", listener);
    }

    public async run() {
        this.emit(
            "debug",
            `[run]: Searching every ${ms.get(
                this.interval,
                true
            )} for new posts, with (${this.data.length}) users.`
        );
        if (!this.data.length) {
            this.runTimer();
            this.emit("debug", `No users in this.data`);
            return;
        }

        for (const user of this.data) {
            const posts = await this.api.fetchUserPosts(
                user.id,
                true,
                this.interval
            );
            if (!is.array(posts)) {
                this.emit("debug", `[${user.name}] (${user.id}) no new posts.`);
                continue;
            }
            for (const post of posts) {
                const formattedPost = format.post(post);
                if (!formattedPost) {
                    continue;
                }
                if (
                    is.array(user.ignoreText) &&
                    user.ignoreText.some(
                        (c) =>
                            is.string(formattedPost.content) &&
                            formattedPost.content
                                .toLowerCase()
                                .includes(c.toLowerCase())
                    )
                ) {
                    continue;
                }
                this.sendDefault(user, formattedPost);
                this.emit("post", user, formattedPost, post);
            }
        }
        this.runTimer();
        return;
    }
    private runTimer() {
        return setTimeout(() => this.run(), this.interval);
    }
}
