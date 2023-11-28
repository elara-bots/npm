import { fetch, type RequestMethod } from "@elara-services/fetch";
import { name, version } from "../package.json";
import * as endpoints from "./constants";
import type {
    Bearer,
    Data,
    FetchAllResult,
    FetchBearer,
    FetchResponse,
    FetchResults,
    GetUrlResults,
    MessageStatus,
    Results,
    Stream,
    StreamResults,
    User,
    Vod,
    VodQuery,
} from "./interfaces";
const pre = `[${name}, v${version}]: `;
const error = (message: string): MessageStatus => ({ status: false, message });

export class Twitch {
    #clientId: string;
    #clientSecret: string;
    #debug: boolean;
    public bearer: Bearer;
    public constructor(clientId: string, clientSecret: string) {
        if (!clientId || !clientSecret) {
            throw new Error(
                `${pre} You failed to provide the 'clientId' or 'clientSecret' in the constructor.`
            );
        }
        this.#clientId = clientId;
        this.#clientSecret = clientSecret;
        this.bearer = { token: null, expire: 0 };
        this.#debug = false;
    }

    public async check(users: Data) {
        if (typeof users === "string") {
            users = [users];
        }
        const success: string[] = [];
        const failed: string[] = [];
        const data = await this.user(users);
        if (data.status) {
            for (const user of data.data) {
                if (users.includes(user.login)) {
                    success.push(user.login);
                } else if (users.includes(user.id)) {
                    success.push(user.id);
                }
            }
            failed.push(...users.filter((c) => !success.includes(c)));
        } else {
            failed.push(...users);
        }
        return { success, failed };
    }

    #getURL(endpoint: string, users: Data, isStream = true): GetUrlResults {
        if (typeof users === "string") {
            users = [users];
        }
        if (!users.length) {
            return error(`You failed to provide any user names or IDs`);
        }
        const url = new URL(endpoint);
        for (const user of users) {
            if (isNaN(parseInt(user))) {
                url.searchParams.append(
                    isStream ? "user_login" : "login",
                    user
                );
            } else {
                url.searchParams.append(isStream ? "user_id" : "id", user);
            }
        }
        return { status: true, url: url.href };
    }

    public async vods(query: VodQuery): Results<Vod[]> {
        const url = new URL(endpoints.vods);
        const a = (name: string, value: string) =>
            url.searchParams.append(name, value);
        for (const v of ["period", "type", "sort", "language"]) {
            if (typeof query[v as keyof VodQuery] === "string") {
                a(v, query[v as keyof VodQuery] as string);
            }
        }
        const sort = (field: string, array: string[]) => {
            if (array.length) {
                for (const v of array) {
                    if (!isNaN(parseInt(v))) {
                        a(field, v);
                    }
                }
            }
        };
        sort("id", query.vodIds || []);
        sort("user_id", query.users || []);
        sort("game_id", query.games || []);
        const res = await this.#fetch<{ data: Vod[] }>(url.href);
        if (!res.status) {
            return error(res.message);
        }
        return {
            status: true,
            data: res.data.data,
        };
    }

    public async user(users: Data): Results<User[]> {
        const url = this.#getURL(endpoints.users, users, false);
        if (!url.status) {
            return error(url.message);
        }
        const res = await this.#fetch<{ data: User[] }>(url.url);
        if (!res.status) {
            return error(res.message);
        }
        if (!res.data.data?.length) {
            return error(`There was no one found.`);
        }
        for await (const user of res.data.data) {
            user.live = await this.#checkIfLive(user.login);
        }
        return { status: true, data: res.data.data || [] };
    }

    public async stream(users: Data): StreamResults {
        const url = this.#getURL(endpoints.streams, users);
        if (!url.status) {
            return error(url.message);
        }
        const res = await this.#fetch<{ data: Stream[] }>(url.url);
        if (!res.status) {
            if (res.code === 500) {
                return {
                    status: false,
                    message: res.message,
                    code: 500,
                };
            }
            return error(`The request gave back no data.`);
        }
        if (!res.data.data.length) {
            return error(`There was no one found.`);
        }
        return { status: true, data: res.data.data || [] };
    }

    public async fetchAll(users: string | string[]): FetchAllResult {
        if (!users.length) {
            return error(`You failed to provide any user name or IDs`);
        }
        const [u, s] = await Promise.all([
            this.user(users),
            this.stream(users),
        ]);
        if (!u.status && !s.status) {
            return error(`No users or streams match: ${users}`);
        }
        return {
            status: true,
            users: u.status ? u.data ?? [] : [],
            streams: s.status ? s.data ?? [] : [],
        };
    }

    public setDebug(bool: boolean) {
        this.#debug = bool;
        return this;
    }

    private log(...args: unknown[]) {
        if (!this.#debug) {
            return;
        }
        console.log(`${pre} [DEBUG]: `, ...args, "\n");
    }

    async #token() {
        if (!this.bearer.token) {
            this.log(`[BEARER]: No bearer found, fetching a new one.`);
            await this.#generateToken();
        }
        if (this.bearer.expire) {
            if (Date.now() >= this.bearer.expire) {
                this.log(
                    `[BEARER]: Expired bearer found, generating a new one.`
                );
                await this.#generateToken();
            }
        }
        return this.bearer.token;
    }

    async #generateToken() {
        const url = new URL("https://id.twitch.tv/oauth2/token");
        url.searchParams.append("client_secret", this.#clientSecret);
        url.searchParams.append("client_id", this.#clientId);
        url.searchParams.append("grant_type", "client_credentials");
        const response = (
            await fetch(url.href, "POST").send()
        ).json<FetchBearer>();
        if (!response) {
            this.log(
                `[GENERATE:TOKEN:FAILED]: Unable to generate a new bearer token.`
            );
            return null;
        }
        this.bearer.token = response.access_token;
        this.bearer.expire = Date.now() + response.expires_in * 1000;
        this.log(
            `[GENERATE:TOKEN:CREATE]: Generated a new bearer token, expires: ${new Date(
                this.bearer.expire
            ).toLocaleString()}`
        );
        return response.access_token;
    }

    async #fetch<D extends object>(
        url: string,
        method: RequestMethod = "GET"
    ): FetchResults<D> {
        const token = await this.#token();
        if (!token) {
            this.log(
                `[FETCH:ERROR]: Unable to fetch/generate a bearer token to fetch: ${url}`
            );
            return error(
                `Unable to fetch/generate a bearer token to fetch with.`
            );
        }
        const res = (await fetch(url, method)
            .header({
                Authorization: `Bearer ${token}`,
                "Client-Id": this.#clientId,
            })
            .send()
            .catch(() => ({
                statusCode: 500,
                json: () => null,
                headers: {},
            }))) as FetchResponse;
        if (res.statusCode !== 200) {
            this.log(
                `[FETCH:ERROR]: [${method}] Got (${res.statusCode}) status while trying to fetch ${url}`
            );
            if (res.statusCode === 500) {
                return {
                    status: false,
                    code: 500,
                    message: `Unable to fetch (${url}) due to unavailable server.`,
                };
            }
            return error(
                `Got (${res.statusCode}) while trying to fetch the data.`
            );
        }
        const data = res.json<D>();
        if (!data) {
            return error(`Unable to fetch any data from the API`);
        }
        return { status: true, data };
    }

    async #checkIfLive(user: string) {
        const res = await fetch(`https://www.twitch.tv/${user}`)
            .send()
            .catch(() => ({ text: () => ``, statusCode: 500 }));
        if (res.statusCode === 200) {
            const text = res.text();
            if (text.includes(`"isLiveBroadcast":true`)) {
                return true;
            }
        }
        return false;
    }
}
export * from "./interfaces";
export * from "./constants";
export { Stream } from "./stream";
