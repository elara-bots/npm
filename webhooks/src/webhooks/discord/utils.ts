import { getPackageStart, is } from "@elara-services/utils";
import { name, version } from "../../../package.json";

export const validWebhookURL = /https?:\/\/(www.|canary.|ptb.)?discord(app)?.com\/api\/|https?:\/\/services.(superchiefyt|elara).workers.dev/gi;

export const defaultOptions = {
    username: "",
    avatar_url: "",
    threadId: ""
}

export function validateURL(url?: unknown) {
    if (!is.string(url) || !url.match(validWebhookURL)) {
        return false;
    }
    return true;
};

export function error(e: unknown) {
    throw new Error(`${getPackageStart({ name, version })}: ${e}`);
}

export function split(url: string) {
    const [id, token] = url.split("webhooks/")[1].split("/") || [null, null];
    if (!id || !token) {
        return null;
    }
    return { id, token };
}

export function url(url: string) {
    try {
        let Url = new URL(url);
        return {
            path: Url.pathname.split("api/")?.[1].replace(/v[0-9]+\//gmi, ""),
            query: Url.search,
            thread_id: Url.searchParams.get("thread_id") || undefined
        }
    } catch (e) {
        return null;
    }
}