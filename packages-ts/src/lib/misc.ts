import { is } from "@elara-services/utils";

export async function fetch<B extends object, T>(
    url: string,
    key = "",
    body: B | undefined = undefined,
    postRequest = false,
    returnRaw = false,
    addHeaders?: Record<string, string | number>,
): Promise<T | null> {
    try {
        const client = await import("@elara-services/fetch").catch(() => {});
        if (!client) {
            throw new Error(`NPM package (@elara-services/fetch) not found`);
        }
        let headers = {
            "user-agent": `Services v${Math.floor(Math.random() * 9999)}`,
            authorization: "",
        };
        if (is.object(addHeaders)) {
            headers = { ...headers, ...addHeaders };
        }

        if (is.string(key)) {
            headers["authorization"] = key;
        } else {
            // @ts-expect-error
            delete headers["authorization"];
        }
        const res = await client
            .fetch(url, postRequest ? "POST" : "GET")
            .header(headers)
            .body(body, "json")
            .send()
            .catch(() => ({ statusCode: 500, body: "", json: () => "" }));
        if (res.statusCode !== 200) {
            return null;
        }
        if (returnRaw) {
            return res.body as T;
        }
        return res.json() as T;
    } catch {
        return null;
    }
}
