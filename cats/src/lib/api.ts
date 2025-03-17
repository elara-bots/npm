import { getKeys, is, sleep, status } from "@elara-services/basic-utils";
import { fetch } from "@elara-services/fetch";
import {
    CountResponse,
    DelResponse,
    QueueResponse,
    Response,
} from "./interfaces";

export class WorkerAPI {
    public constructor(private api: string) { }

    public async queue(limit?: number) {
        return await this.#request<QueueResponse>(`/queue`, { limit });
    }

    public async add(search: string | string[]) {
        return await this.multiple(this.#format(search), true);
    }

    public async remove(search: string) {
        return await this.#request<Response<true>>(`/remove`, { id: search });
    }

    public async del(search: string | string[]) {
        return await this.#request<DelResponse>(
            `/del`,
            undefined,
            this.#format(search)
        );
    }

    public async multiple(urls: string | string[], add = true) {
        return await this.#request<Response<true>>(
            `/multiple`,
            { add },
            this.#format(urls)
        );
    }

    public async count() {
        return await this.#request<CountResponse>(`/count`);
    }

    public get videos() {
        return {
            add: async (id: string) => await this.#request<Response<true>>(`/addvideo`, { id }),
            // @ts-ignore
            get: async () => ((await this.#request<{ status: true, videos: string[] }>(`/videos`))?.videos ?? []) as string[],
            has: async (id: string) => (await this.videos.get()).includes(id),
            setMultiple: async (ids: string[]) => await this.#request<Response<true>, undefined, { ids: string[] }>(`/addvideo`, undefined, { ids }),
        };
    }

    // eslint-disable-next-line @typescript-eslint/ban-types
    async #request<R extends object, Q = {}, B = {}>(
        endpoint: string,
        query?: Q,
        body?: B,
        retries = 0
    ): Promise<R | Response<false>> {
        const r = fetch(`${this.api}${endpoint}`);
        if (query && typeof query === "object") {
            for (const key of getKeys(query)) {
                // @ts-ignore
                r.query(key, query[key]);
            }
        }
        if (body && typeof body === "object") {
            r.body(body, "json");
            r.method = "POST";
        }
        const res = await r.send().catch(() => { });
        if (!res || res.statusCode !== 200) {
            if (res && res.statusCode === 429 && retries <= 5) {
                await sleep(10_000); // Wait 10s before trying again.
                return await this.#request(endpoint, query, body, retries + 1);
            }
            return status.error(res
                ? `Got (${res.statusCode}) status while trying to fetch the data.`
                : `Unknown issue while trying to fetch the data.`);
        }
        // @ts-ignore
        return res.json<R>();
    }

    #format(search: string | string[]) {
        return is.string(search) ? [search] : search;
    }
}
