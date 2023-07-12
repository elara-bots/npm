export async function fetch<B extends object, T>(
    url: string,
    key = "",
    body: B | undefined = undefined,
    postRequest = false,
    returnRaw = false,
): Promise<T | null> {
    try {
        const client = await import("@elara-services/fetch").catch(() => {});
        if (!client) {
            throw new Error(`NPM package (@elara-services/fetch) now found`);
        }
        const headers = {
            "User-Agent": `Services v${Math.floor(Math.random() * 999999)}`,
            authorization: "",
        };
        if (key !== "" && key) {
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
