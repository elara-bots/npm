import { fetch } from "@elara-services/fetch";
import { status } from "@elara-services/utils/dist/lib/status";
import { name, version } from "../../package.json";
import type {
    RedGifSearchOrder,
    RedGifsFetchPost,
    RedGifsGetOptions,
    RedGifsGetResults,
    RedGifsSearchResult,
    RedGifsUser,
    RedGifsUserPost,
} from "../interfaces/redgifs";

export class RedGifsClient {
    private baseURL: string;
    private bearer: string | null;
    private userAgent: string;
    private debug: boolean;
    public constructor(
        bearer?: string,
        baseURL = "https://api.redgifs.com",
        userAgent = `${name} v${version}`
    ) {
        this.baseURL = baseURL;
        if (bearer) {
            this.bearer = bearer;
        } else {
            this.bearer = null;
        }
        this.userAgent = userAgent;
        this.debug = false;
    }

    public setAgent(agent: string) {
        this.userAgent = agent;
        return this;
    }

    public setDebug(toggle: boolean) {
        this.debug = toggle;
        return this;
    }

    private log(...args: unknown[]) {
        if (this.debug) {
            console.log(`[${name}, v${version}]: [DEBUG]: `, ...args);
        }
        return this;
    }

    public checkPostTimeAgainst(post: RedGifsUserPost, seconds: number) {
        if (!post || !post.created) {
            return false;
        }
        if (Date.now() - new Date(post.created).getTime() <= seconds) {
            return true;
        }
        return false;
    }

    public async get(postId: string) {
        return await this._fetch<RedGifsFetchPost>({
            endpoint: `/v2/gifs/${postId}`,
            auth: true,
            retry: true,
            query: {
                users: "yes",
                views: "yes",
            },
        });
    }

    public async fetchUser(user: string, fetchPosts = false) {
        const data = {
            status: true,
            user: null as RedGifsUser | null,
            posts: [] as RedGifsUserPost[],
        };
        const r = await this._fetch<RedGifsUser>({
            endpoint: `/v1/users/${user}`,
            auth: false,
            retry: false,
        });
        if (r.status && r.data) {
            data.user = r.data;
            data.user.created = new Date(
                data.user.creationtime * 1000
            ).toISOString();
        }
        if (fetchPosts) {
            const p = await this.fetchUserPosts(user);
            if (p) {
                data.posts = p.gifs;
            }
        }
        if (!data.user && !data.posts.length) {
            return status.error(`Unable to fetch the user or any user posts.`);
        }
        return data;
    }

    public async search(
        text: string,
        query?: {
            count?: number;
            order?: RedGifSearchOrder;
            page?: number;
        }
    ) {
        const r = await this._fetch<RedGifsSearchResult>({
            endpoint: `/v2/gifs/search`,
            auth: true,
            query: {
                count: query?.count || 100,
                page: query?.page || 1,
                order: query?.order || "new",
                search_text: text,
            },
            retry: true,
        });
        if (r.status) {
            r.data.gifs = r.data.gifs.map((c) => {
                c.url = `https://redgifs.com/watch/${c.id}`;
                c.created = new Date(c.createDate * 1000).toISOString();
                return c;
            });
        }
        return r.status ? r.data : null;
    }

    public async fetchUserPosts(
        user: string,
        query?: {
            order?: RedGifSearchOrder;
            count?: number;
            page?: number;
        }
    ) {
        const r = await this._fetch<RedGifsSearchResult>({
            endpoint: `/v2/users/${user}/search`,
            auth: true,
            query: {
                order: query?.order || "new",
                count: query?.count || 100,
                page: query?.page || 1,
            },
            retry: true,
        });
        if (r.status) {
            r.data.gifs = r.data.gifs.map((c) => {
                c.url = `https://redgifs.com/watch/${c.id}`;
                c.created = new Date(c.createDate * 1000).toISOString();
                return c;
            });
        }
        return r.status ? r.data : null;
    }

    private async fetchBearer() {
        const r = await fetch(`${this.baseURL}/v2/auth/temporary`)
            .header({
                "user-agent": this.userAgent,
                Host: "api.redgifs.com",
                Accept: "application/json",
            })
            .send()
            .catch(() => null);
        if (!r) {
            this.log(
                `[FETCH:BEARER]: Unable to fetch a new bearer, no response from the /v2/auth/temporary endpoint.`
            );
            return null;
        }
        if (r.statusCode === 200) {
            return r.json<{ token: string }>()?.token || "";
        }
        this.log(
            `[FETCH:BEARER]: Unable to fetch a new bearer, status code (${r.statusCode})`,
            r.text()
        );
        return null;
    }

    private async _fetch<D extends object>({
        endpoint = undefined,
        auth = false,
        body = null,
        query = null,
        headers = null,
        retry = true,
    }: RedGifsGetOptions): Promise<RedGifsGetResults<D>> {
        if (!endpoint) {
            return status.error(`No endpoint provided.`);
        }
        const r = fetch(`${this.baseURL}${endpoint}`).header(
            "user-agent",
            this.userAgent
        );
        if (auth) {
            if (!this.bearer) {
                this.log(
                    `[FETCH:${endpoint}]: No bearer found, fetching a new one.`
                );
                this.bearer = await this.fetchBearer();
            }
            if (!this.bearer) {
                this.log(
                    `[FETCH:${endpoint}]: No bearer found, and one couldn't be generated. Aborting request.`
                );
                return status.error(`Unable to fetch a bearer token.`);
            }
            r.header({
                authorization: `Bearer ${this.bearer}`,
            });
        }
        if (query && typeof query === "object") {
            r.query(query);
        }
        if (headers && typeof headers === "object") {
            r.header(headers);
        }

        if (body && typeof body === "object") {
            r.body(body, "json");
        }
        const res = await r.send().catch(() => null);
        if (!res) {
            this.log(`[FETCH:${endpoint}]: No response from the API.`);
            return status.error(`No response?`);
        }
        if (res.statusCode === 401) {
            this.log(
                `[FETCH:${endpoint}]: Unauthorized, fetching a new bearer token and invalidating the old one.`
            );
            this.bearer = null; // Reset the bearer token if the status is unauthorized, so the next request fetches a new one.
            if (retry) {
                this.log(
                    `[FETCH:${endpoint}]: Retrying the request, using a fresh bearer token.`
                );
                return await this._fetch({
                    endpoint,
                    auth,
                    body,
                    headers,
                    retry: false,
                    query,
                });
            }
            return status.error(`Unable to fetch (${endpoint}), status 401`);
        }
        if (res.statusCode !== 200) {
            this.log(
                `[FETCH:${endpoint}]: Unable to complete the request, got status code (${res.statusCode})`,
                res.text()
            );
            return status.error(
                `Unable to fetch (${endpoint}), status ${res.statusCode}`
            );
        }
        const json = res.json();
        if (!json || typeof json !== "object") {
            this.log(
                `[FETCH:${endpoint}]: Unable to complete the request, 'res.json()' didn't return as an object.`
            );
            return status.error(
                `Unable to fetch (${endpoint}), no data returned?`
            );
        }
        return status.data(json as D);
    }
}
