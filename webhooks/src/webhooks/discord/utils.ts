import { name, version } from "../../../package.json";

export const defaultOptions = {
    username: "",
    avatar_url: "",
    threadId: ""
}

export function validateURL(url?: unknown) {
    if (!url || typeof url !== "string") return false;
    if (!url.match(/https?:\/\/(www.|canary.|ptb.)?discord(app)?.com\/api\/|https?:\/\/services.superchiefyt.workers.dev/gi)) return false;
    return true;
};

export function error(e: unknown) {
    throw new Error(`[${name}, ${version}]: ${e}`);
}
export function status(status: boolean, data: unknown) {
    return { status, data };
}

export function split(url: string) {
    let [id, token] = url.split("webhooks/")[1].split("/") || [null, null];
    if (!id || !token) return null;
    return { id, token };
}

export function url(url: string) {
    try {
        let Url = new URL(url);
        return {
            path: Url.pathname.split("api/")[1],
            query: Url.search,
            thread_id: Url.searchParams.get("thread_id") || undefined
        }
    } catch (e) {
        return null;
    }
}