import { get, is, noop, sleep } from "@elara-services/basic-utils";
import { fetch, RequestMethod } from "@elara-services/fetch";
import { CheerioAPI, load } from "cheerio";


export const select = (start: string | RegExp, end: string | RegExp) => ({ start, end });

export async function fetchSite(url: string, options?: Partial<{
    headers: Record<string, string>,
    query: Record<string, string>,
    body: any,
    method: RequestMethod;
    redirects: boolean
}>, retries = 0): Promise<CheerioAPI> {
    const uri = new URL(url);
    if (is.object(options, true) && is.object(options.query, true)) {
        for (const [k, v] of Object.entries(options.query)) {
            uri.searchParams.append(k, v);
        }
    }
    const res = fetch(uri.toString(), options?.method ?? "GET");
    if (is.object(options, true)) {
        if (is.object(options.headers, true)) {
            res.header(options.headers);
        }
        if (is.object(options.body, true)) {
            res.body(options.body, "json");
        }
    }
    const r = await res.send().catch(noop);
    if (!r) {
        throw new Error(`No response found for that link.`)
    }
    if ([301, 302].includes(r.statusCode) && is.string(r.headers['location']) && options?.redirects === true) {
        return await fetchSite(r.headers['location'] as string, options, retries);
    }
    if (r.statusCode === 429 && retries <= 5) {
        await sleep(get.secs(5));
        return await fetchSite(url, options, retries + 1);
    }
    if (r.statusCode !== 200) {
        throw new Error(`Got (${r.statusCode}) status for that link.`)
    }
    return load(r.text());
}
export const between = (str: string, options: ReturnType<typeof select>) => {
    str = (str.split?.(options.start)?.[1]?.split?.(options.end)?.[0] ?? "").trim();
    return {
        str: (def = "") => str || def,
        int: (def = 0) => parseInt(str.replace(/,/gi, "")) || def,
    }
};