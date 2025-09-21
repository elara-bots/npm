import { is, make, Nullable, PossiblePromise, status } from "@elara-services/basic-utils";
import { RequestMethod } from "@elara-services/fetch";
import { fetch as JSONFetch } from "@elara-services/packages";
import { VercelRequest, VercelResponse } from "@vercel/node";
import moment from "moment-timezone";
import { Db, MongoClient } from "mongodb";
import { CreateRun, CustomHeader, StrOptions } from "./interfaces";

export const timeZone = process.env.TIMEZONE ?? "America/Los_Angeles";

moment.tz.setDefault(timeZone);

export const getMoment = (date: string | Date, tz = timeZone) => moment.tz(date, tz);


export function customHeaders(url: string) {
    const uri = new URL(url);
    const env = process.env.CUSTOM_HEADERS;
    if (!env || (!env.startsWith("[") && !env.endsWith("]"))) {
        return;
    }
    try {
        const data = JSON.parse(env) as CustomHeader[];
        if (!is.array(data)) {
            return;
        }
        const find = data.find((c) => uri.hostname.toLowerCase().includes(c.match.toLowerCase()));
        if (find) {
            return find.headers;
        }
        return;
    } catch {
        return;
    }
}

export const query = (req: VercelRequest, res: VercelResponse) => {
    return {

        assertAuth: (name = "key") => {
            const auth = req.headers['authorization'] || query(req, res).str(name, { required: false, default: "" });
            if (!process.env.ADMIN_KEYS?.includes(auth)) {
                throw new Error(`Authorization is required to use this endpoint.`);
            }
        },

        assertID: (id: string | number) => {
            id = parseInt(`${id}`);
            if (!is.number(id) || id >= 100_000_000) {
                throw new Error(`Thread (${id}) ID is not valid.`)
            }
            return id as number;
        },

        getServiceQuery: (id: string | number) => {
            const q = query(req, res);
            return {
                id: q.assertID(id),
                cache: q.bool("cache", { default: true, required: false }),
                display: q.bool("display", { default: false, required: false }),
                games: (q.arr("games", ",", false) ?? []).filter((c) => is.string(c)),
                roleId: q.str("roleId", { required: false, default: "" }),
                showDelete: q.bool("delete", { required: false, default: false }),
                ids: (q.arr("ids", ",", false) || []).filter((c) => is.string(c)),
                versions: q.bool("check", { required: false, default: false }),
                support: q.bool("support", { required: false, default: false })
            };
        },

        fetch: async <T>(url: string, headers?: any, raw = false) => {
            return await JSONFetch<object, T>(url, { headers, redirects: true, raw });
        },

        arr: (name: string, split = ",", required = false) => {
            const data = (req.query[name] as string || "").split(split).filter((c) => is.string(c));
            if (!is.array(data) && required) {
                throw new Error(`Query (${name}) is required`);
            }
            return data;
        },

        headers: (url: string, addUserAgent = false) => {
            const body = req.body?.headers ?? {};
            const data = (is.object(body, true) ? body : customHeaders(url)) ?? {};
            // @ts-ignore
            if (!data['User-Agent'] && addUserAgent) {
                // @ts-ignore
                data['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36';
            }
            return data as Record<string, string>;
        },

        url: (required = false) => {
            const url = req.query.url as string;
            if (required) {
                if (!is.string(url)) {
                    throw new Error(`You must provide a 'url' query-string param.`);
                }
            }
            return url ?? "";
        },
        ms: () => req.query.ms ? parseInt(req.query.ms as string) : undefined,

        str: (name: string, options: StrOptions = {}) => {
            const str = (req.query[name] ?? options.default ?? "") as string;
            if (options.required) {
                if (!is.string(str)) {
                    throw new Error(options.message || `You must provide a '${name}' param.`);
                }
            }
            return str.toString() ?? options.default ?? "";
        },

        body: <T>(required?: Array<keyof T>) => {
            const body = req.body as T;
            if (is.array(required)) {
                if (!is.object(body, true)) {
                    throw new Error(`You must provide a JSON body in the request.`)
                }
                const keys = Object.keys(body);
                const missing = make.array<string>();
                for (const r of required) {
                    // @ts-ignore
                    if (!keys.includes(r as string) || !body[r as string]) {
                        missing.push(r as string);
                    }
                }
                if (is.array(missing)) {
                    throw new Error(`You must provide ${missing.map((c) => `'${c}'`).join(", ")} in the body of the request.`)
                }
            }
            return is.object(body, true) ? body : {} as T;
        },

        bool: (name: string, options: Partial<{ required: boolean, message: string, default: boolean }> = {}) => {
            if (options.required === true) {
                if (is.undefined(req.query[name]) || is.null(req.query[name])) {
                    throw new Error(options.message || `You must provide a '${name}' query param.`);
                }
            }
            const bool = (n: any, def = true) => ["true", "false", "yes", "no", "y", "n"].includes(n) ? ["true", "yes", "y"].includes(n) ? true : false : def;
            return bool(req.query[name], options.default ?? true);
        }
    };
}


export function create(
    run: (options: CreateRun) => PossiblePromise<unknown>,
    methods?: RequestMethod[],
) {
    return async (req: VercelRequest, res: VercelResponse) => {
        try {
            if (is.array(methods)) {
                if (!methods.some((c) => c === req.method)) {
                    throw new Error(`Method (${req.method}) is not allowed, only (${methods.join(", ")}) is allowed!`);
                }
            }
            const keys = (process.env.API_KEYS || "").split("|").filter((c) => is.string(c));
            if (is.array(keys)) {
                const hasKey = keys.includes(req.headers['authorization'] || "");
                if (!hasKey) {
                    throw new Error(`An API key is required to use this service.`)
                }
            }
            let client: Nullable<MongoClient> = null;
            let db: Nullable<Db> = null;
            if (is.string(process.env.MONGODB_URI)) {
                const clientPromise = await import("./mongodb").catch(() => {});
                if (clientPromise) {
                    client = await clientPromise.default;
                    db = client.db();
                }
            }
            await run({
                req, res,
                query: query(req, res),
                error: (msg: string, extra: object = {}) => res.json({
                    ...status.error(msg),
                    ...extra
                }),
                // @ts-ignore
                client: client || null,
                // @ts-ignore
                db: db || null,
            });
        } catch (err) {
            return res.json(
                status.error(
                    is.error(err) ? err.message :
                        is.string(err) ? err : `Unknown error while trying to complete the request.`
                )
            )
        }
    };
}