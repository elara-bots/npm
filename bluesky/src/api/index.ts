import { BskyAgent } from "@atproto/api";
import type { FeedViewPost } from "@atproto/api/dist/client/types/app/bsky/feed/defs";
import { Record } from "@atproto/api/dist/client/types/app/bsky/feed/post";
import { get, is, log, sleep, status } from "@elara-services/utils";
import { name, version } from "../../package.json";
import type {
    APIKey,
    APIOptions,
    FeedOptions,
    PostViewed,
} from "../interfaces";
import { baseService, checkIfNew, getRandomKey, transformKeys } from "../utils";

export class API {
    #agents = new Map<string, BskyAgent>();
    #debug = false;
    public constructor(protected options: APIOptions) {
        if (is.boolean(options.debug)) {
            this.#debug = options.debug;
        }
    }

    private debug(...args: unknown[]) {
        if (!this.#debug) {
            return;
        }
        log(`[${name}, v${version}]: `, ...args);
    }

    public get agents() {
        return {
            add: async (keys: APIOptions["keys"]) => {
                for (const key of transformKeys(keys)) {
                    if (
                        this.#agents.has(
                            this.#getStr(key.username, key.service)
                        )
                    ) {
                        continue;
                    }
                    await this.agent(key);
                }
                return;
            },
            remove: (name: string, service?: string): API => {
                this.#agents.delete(this.#getStr(name, service));
                return this;
            },
            list: () => [...this.#agents.values()],
            search: (
                query: {
                    username?: string;
                    service?: string;
                },
                searchType: "filter" | "find" = "find"
            ) => {
                const list = this.agents.list();
                if (!is.array(list)) {
                    return null;
                }
                const data = list[searchType](
                    (c) =>
                        c.session?.handle === query.username ||
                        c.service.href == query.service
                );
                if (is.array(data)) {
                    return data;
                } else if (data) {
                    return [data];
                }
                return null;
            },
        };
    }

    #getDefaultService() {
        return this.options.defaultService || baseService;
    }

    #getStr(username: string, service?: string) {
        return `${service || this.#getDefaultService()}|${username}`;
    }

    private async agent(key?: APIKey) {
        if (!key) {
            key = getRandomKey(this.options.keys);
        }
        const k = this.#getStr(key.username, key.service);
        if (this.#agents.has(k)) {
            return this.#agents.get(k) as BskyAgent;
        }
        const agent = new BskyAgent({
            service: key.service || this.#getDefaultService(),
        });
        await agent
            .login({ identifier: key.username, password: key.appKey })
            .then((r) =>
                this.debug(
                    `[ACCOUNT:${r.success ? "Connected" : "ERROR"}]: For ${k}`
                )
            )
            .catch((err) => this.debug(`[ACCOUNT:ERROR] For ${k}`, err));
        this.#agents.set(k, agent);
        return agent;
    }

    get users() {
        return {
            fetch: async (name: string) => {
                const agent = await this.agent();
                const res = await agent
                    .getProfile({ actor: name })
                    .catch(() => ({ success: false, data: null }));

                if (!res.success || !res.data) {
                    return status.error(`Unable to fetch (${name})`);
                }
                return status.data(res.data);
            },
            fetchMultiple: async (names: string[]) => {
                const agent = await this.agent();
                const res = await agent
                    .getProfiles({ actors: names })
                    .catch(() => ({ success: false, data: null }));

                if (!res.success || !res.data) {
                    return status.error(
                        `Unable to fetch (${names.join(", ")})`
                    );
                }
                return status.data(res.data.profiles);
            },

            posts: {
                fetch: async (username: string, postId: string) => {
                    const agent = await this.agent();
                    const res = await agent
                        .getPost({
                            rkey: postId,
                            repo: username,
                        })
                        .catch((e) => {
                            this.debug(`[POSTS:FETCH]: Error`, e);
                            return null;
                        });
                    if (!res) {
                        return status.error(`Unable to fetch the post info`);
                    }
                    return status.data(res);
                },
                fetchMultiple: async (
                    posts: { username: string; postId: string }[]
                ) => {
                    if (!posts.length) {
                        return status.error(
                            `You didn't provide any posts to fetch.`
                        );
                    }
                    const res: {
                        uri: string;
                        cid: string;
                        value: Record;
                    }[] = [];
                    const agent = await this.agent();
                    for await (const post of posts) {
                        const r = await agent
                            .getPost({
                                repo: post.username,
                                rkey: post.postId,
                            })
                            .catch((e) => {
                                this.debug(`[POSTS:FETCH_MULTIPLE]: Error`, e);
                                return null;
                            });
                        if (r && r.cid) {
                            res.push(r);
                        }
                    }
                    if (!res.length) {
                        return status.error(`Unable to fetch any post data.`);
                    }
                    return status.data(res);
                },
                fetchFromURL: async (url: string | string[]) => {
                    if (!Array.isArray(url)) {
                        url = [url];
                    }
                    if (!url.length) {
                        return status.error(
                            `You didn't provide any urls to fetch.`
                        );
                    }
                    const agent = await this.agent();
                    const posts = [];
                    for await (const u of url) {
                        const s = this.#getPostInfoFromURL(u);
                        if (!s) {
                            continue;
                        }
                        const r = await agent
                            .getPost({
                                repo: s.username,
                                rkey: s.postId,
                            })
                            .catch((e) => this.debug(e));
                        if (r && r.cid) {
                            posts.push(r);
                        }
                    }
                    if (!posts.length) {
                        return status.error(`Unable to fetch any posts.`);
                    }
                    return status.data(posts);
                },
            },

            feeds: {
                fetch: async (name: string, options?: FeedOptions) => {
                    const agent = options?.agent || (await this.agent());
                    const res = await agent
                        .getAuthorFeed({
                            actor: name,
                            limit: options?.limit || 100,
                            filter: options?.filter,
                        })
                        .catch(() => ({ success: false, data: null }));

                    if (!res.success || !res.data) {
                        return status.error(`Unable to fetch (${name})`);
                    }
                    if (is.number(options?.checkAgainstTime)) {
                        const feed = res.data.feed.filter((c) =>
                            c.reason?.$type ===
                            "app.bsky.feed.defs#reasonRepost"
                                ? checkIfNew(
                                      {
                                          ...(c.reason.by as object),
                                          record: {
                                              createdAt: c.reason.indexedAt,
                                          },
                                      } as PostViewed,
                                      options?.checkAgainstTime || get.mins(1)
                                  )
                                : checkIfNew(
                                      c.post as PostViewed,
                                      options?.checkAgainstTime || get.mins(1)
                                  )
                        );
                        if (!is.array(feed)) {
                            return status.error(
                                `Unable to find any new posts.`
                            );
                        }
                        return status.data(feed);
                    }
                    return status.data(res.data.feed);
                },
                fetchMultiple: async (
                    names: string[],
                    options?: FeedOptions
                ) => {
                    if (!is.object(options)) {
                        options = {};
                    }
                    const agent = options?.agent || (await this.agent());
                    const feeds = new Map<string, FeedViewPost[]>();
                    for await (const name of names) {
                        const res = await this.users.feeds.fetch(name, {
                            ...options,
                            agent,
                        });
                        if (res.status) {
                            feeds.set(name, res.data);
                        }
                    }
                    if (!feeds.size) {
                        return status.error(
                            `No posts found for (${names.length}) users provided.`
                        );
                    }
                    return status.data(feeds);
                },
            },

            likes: {
                get: async (name: string, limit = 100) => {
                    const agent = await this.agent();
                    const res = await agent
                        .getActorLikes({ actor: name, limit })
                        .catch(() => ({ success: false, data: null }));

                    if (!res.success || !res.data) {
                        return status.error(`Unable to fetch (${name})`);
                    }
                    return status.data(res.data.feed);
                },
                post: async (cid: string, uri: string) => {
                    const agent = await this.agent();
                    const res = await agent.like(uri, cid).catch((e) => e);
                    if (!("cid" in res)) {
                        return status.error(
                            res instanceof Error ? res.message : res
                        );
                    }
                    return status.data(res);
                },
                likeFromAccounts: async (
                    post: { cid: string; uri: string } | string,
                    users: { username: string; appKey: string }[],
                    shouldRepost?: boolean
                ) => {
                    if (typeof post === "string") {
                        const r = await this.users.posts.fetchFromURL(post);
                        if (!r.status) {
                            return r;
                        }
                        post = {
                            cid: r.data[0].cid,
                            uri: r.data[0].uri,
                        };
                    }
                    if (!post.cid || !post.uri) {
                        return status.error(
                            `You provided an invalid post.cid or post.uri`
                        );
                    }
                    if (!users.length) {
                        return status.error(
                            `You didn't provide any users to use.`
                        );
                    }
                    const data = [];
                    let i = 0;
                    for await (const user of users) {
                        if (!user.username || !user.appKey) {
                            continue;
                        }
                        const api = new API({
                            keys: [user],
                            debug: true,
                        });
                        const agent = await api.agent();
                        if (shouldRepost === true) {
                            const repost = await agent
                                .repost(post.uri, post.cid)
                                .catch((e) => this.debug(e));
                            if (repost && repost.cid) {
                                data.push({
                                    repost,
                                });
                            }
                        }
                        const r = await agent
                            .like(post.uri, post.cid)
                            .catch((e) => this.debug(e));
                        if (r && r.cid) {
                            data.push({
                                like: r,
                            });
                        }
                        await sleep(i * 500);
                        i++;
                    }
                    if (!data.length) {
                        return status.error(
                            `Unable to like the post on any account.`
                        );
                    }
                    return status.data(data);
                },
            },
        };
    }

    #getPostInfoFromURL(url: string) {
        const str = url.split("/profile/")?.[1] || "";
        if (!str) {
            return null;
        }
        const [username, postId] = str.split("/post/");
        if (!username || !postId) {
            return null;
        }
        return {
            username,
            postId,
        };
    }
}
