import { fetch } from "@elara-services/fetch";
import { status } from "@elara-services/utils/dist/lib/status";
import type {
    TenorSearchParams,
    TenorSearchResults,
    TenorGetOptions,
} from "../interfaces/tenor";

export class TenorClient {
    private key: string;
    public constructor(key: string) {
        this.key = key;
    }

    public async search({
        q,
        anon_id,
        ar_range,
        contentfilter,
        limit,
        locale,
        media_filter,
        pos,
    }: TenorSearchParams) {
        const r = await this.get<TenorSearchResults>({
            endpoint: `/search`,
            query: {
                q,
                anon_id,
                ar_range,
                contentfilter,
                limit,
                locale,
                media_filter,
                pos,
            },
        });
        if (!r) {
            return status.error(
                `Unable to fetch any tenor gifs with the query: ${q}`
            );
        }
        return status.data(r);
    }

    private async get<D extends object>({
        endpoint,
        body = null,
        query = null,
        headers = null,
    }: TenorGetOptions) {
        const r = fetch(`https://tenor.googleapis.com/v2${endpoint}`).query({
            key: this.key,
        });
        if (body && typeof body === "object") {
            r.body(body, "json");
        }
        if (query && typeof query === "object") {
            for (const [name, value] of Object.entries(query)) {
                if (value) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    r.query(name, value as any);
                }
            }
        }
        if (headers && typeof headers === "object") {
            r.header(headers);
        }
        const res = await r.send().catch(() => null);
        if (!res || res.statusCode !== 200) {
            return null;
        }
        return res.json() as D;
    }
}
