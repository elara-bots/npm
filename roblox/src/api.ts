import { get, getKeys, is, make, noop, Nullable, sleep, status } from "@elara-services/basic-utils";
import { fetch, RequestMethod } from "@elara-services/fetch";
import moment from "moment";
import {
    AnyPOSTUsersAPIResponse, BasicRobloxResponse,
    POSTUsersAPIResponseWithId, POSTUsersAPIResponseWithSearch,
    RawBasicRobloxResponse, RobloxOptions, RobloxParsedGroupResponse,
    RobloxResponse,
    RobloxUserGroupRolesResponse,
    RobloxUserInfoResponse, RobloxUserPresences, StrNum,
    UserSearchResponse
} from "./interfaces";
import { bug, def, messages, ROBLOX_API } from "./utils";

export class RobloxAPI {
    options: RobloxOptions = {
        avatar: def.avatar,
        info: def.info,
    };

    public constructor(private cookie?: Nullable<string>) { }

    public get fetchRoblox() {
        return this.fetch;
    }

    public get fetchBasicRobloxInfo() {
        return this.basic;
    }

    public get findByUsername() {
        return this.search;
    }

    public setCookie(cookie: Nullable<string>) {
        this.cookie = cookie;
        return this;
    }

    public get bulk() {
        return {
            fetch: async (ids: StrNum[], full = false, groups = true) => {
                const r = await this.#fetchUsers<POSTUsersAPIResponseWithId>(`/users`, {
                    userIds: ids.map((c) => parseInt(`${c}`)),
                });
                if (!r || !is.array(r.data)) {
                    return status.error(`Nothing found for any ids provided.`);
                }
                if (full) {
                    const data = make.array<Omit<RobloxResponse, "status">>();
                    for await (const c of r.data) {
                        if (!c.id) {
                            continue;
                        }
                        const r = await this.fetch(c.id, "RobloxBulkIdFetch", groups);
                        if (r.status) {
                            // @ts-ignore
                            delete r.status;
                            data.push(r);
                        }
                    }
                    if (!is.array(data)) {
                        return status.error(`The users full data couldn't be fetched.`);
                    }
                    return status.json({
                        users: data,
                    });
                }
                return status.json({
                    users: r.data,
                });
            },

            search: async (usernames: string[], full = false, groups = true) => {
                const r = await this.#fetchUsers<POSTUsersAPIResponseWithSearch>(`/usernames/users`, {
                    usernames,
                });
                if (!r || !is.array(r.data)) {
                    return status.error(`Nothing found for any usernames provided.`);
                }
                if (full) {
                    const data = make.array<Omit<RobloxResponse, "status" | "basic">>();
                    for await (const c of r.data) {
                        if (!c.id) {
                            continue;
                        }
                        const r = await this.fetch(c.id, "RobloxBulkSearchFetch", groups);
                        if (r.status) {
                            // @ts-ignore
                            delete r.status;
                            // @ts-ignore
                            delete r.basic;
                            data.push(r);
                        }
                    }
                    if (!is.array(data)) {
                        return status.error(`The users full data couldn't be fetched.`);
                    }
                    return status.json({
                        users: data,
                    });
                }
                return status.json({
                    users: r.data,
                });
            },
        }
    }

    public setOptions(options: Partial<RobloxOptions>) {
        if (is.object(options, true)) {
            for (const key of getKeys(options)) {
                const v = options[key];
                if (!is.string(v) || !v.match(/%userid%/gi)) {
                    continue;
                }
                bug(`[setOptions]: options.${key} is now ${v}`);
                options[key] = v;
            }
        }
        return this;
    }

    public async search(name: string, basic = false, groups = true) {
        const data = await this.bulk.search([name], false, false);
        if (!data.status || !is.array(data.users)) {
            return status.error("message" in data ? data.message : `Nothing found for (${name})`);
        }
        const user = data.users[0] as UserSearchResponse;
        if (!user?.id) {
            return status.error(`Nothing found for (${name})`);
        }
        return basic ? this.basic(user.id, "RobloxSearch") : this.fetch(user.id, "RobloxSearch", groups);
    }

    public async basic(id: StrNum, service = "Unknown") {
        let res = await this.#fetch<RawBasicRobloxResponse>(ROBLOX_API.USER.INFO(id));
        if (!res) {
            return status.error(messages.NO_DATA_FOUND(`${id}`));
        }
        return status.json<BasicRobloxResponse & { service: string, basic: true }>({
            service,
            basic: true,
            name: res.name,
            display: res.displayName,
            id: res.id,
            displayExternal: res.externalAppDisplayName,
            banned: res.isBanned,
            verified: res.hasVerifiedBadge,
            created: res.created,
            description: res.description,
        });
    }


    public async presences(userIds: (StrNum)[] = []) {
        const res = await this.#fetch<RobloxUserPresences>(ROBLOX_API.USER.PRESENCES, {
            method: "POST",
            body: { userIds },
            cookie: true,
        })
        if (!res || !is.array(res?.userPresences)) {
            return [];
        }
        return res.userPresences.filter(c => userIds.includes(c.userId) || userIds.includes(`${c.userId}`));
    };

    public async fetch(id: StrNum, service = "Unknown", Groups = true) {
        try {
            let [userReq, g, activity] = await Promise.all([
                this.#fetch<RobloxUserInfoResponse>(this.#getLink("info", id)),
                Groups ? this.#fetch<RobloxUserGroupRolesResponse>(ROBLOX_API.GROUP.ROLES(id), {
                    cookie: true,
                }) : { data: [] },
                this.presences([id]),
            ])
            // @ts-ignore
            if (!userReq || !userReq.status) {
                return status.error(messages.NO_DATA_FOUND(`${id}`));
            }
            if (!g) {
                g = { data: [] };
            }
            const groups = make.array<RobloxParsedGroupResponse>();
            const primary = make.array<RobloxParsedGroupResponse>();
            if (is.array(g.data)) {
                for (const c of g.data) {
                    if (!c?.group) {
                        continue;
                    }
                    const data = make.object<RobloxParsedGroupResponse>({
                        name: c.group.name ?? "",
                        id: c.group.id ?? 0,
                        role_id: c.role?.id,
                        rank: c.role?.rank,
                        role: c.role?.name,
                        members: c.group.memberCount ?? 0,
                        url: ROBLOX_API.GROUP.URL(c.group.id || 0),
                        primary: c.isPrimaryGroup ?? false,
                        owner: c.group.owner ?? null,
                        shout: c.group.shout ?? null,
                    });
                    if (c.isPrimaryGroup === true) {
                        primary.push(data)
                    } else {
                        groups.push(data);
                    }
                }
            };
            return status.json<RobloxResponse>({
                service,
                basic: false as const,
                user: {
                    username: userReq.name ?? 'Unknown',
                    id: userReq.id ?? 0,
                    online: 'Offline',
                    url: ROBLOX_API.USER.URL(id),
                    avatar: userReq.avatar || this.#getLink("avatar", userReq.id, this.options.avatar),
                    bio: userReq?.description ?? "",
                    joined: {
                        full: userReq?.created ?? "",
                        format: userReq?.created && moment(userReq.created).format("L") || ""
                    },
                    lastnames: [],
                    counts: {
                        friends: userReq.friends || 0,
                        followers: userReq.followers || 0,
                        following: userReq.following || 0,
                    }
                },
                // @ts-ignore
                groups: [
                    ...primary,
                    ...groups,
                ],
                activity: is.array(activity) ? activity[0] : null,
            })
        } catch (err) {
            bug(`Error trying to fetch (${id})`, err);
            return status.error(messages.ERROR);
        }
    };

    async #fetch<R, B = unknown>(url: string, options?: {
        method?: RequestMethod,
        body?: B,
        headers?: Record<string, string>,
        cookie?: boolean,
    }, retries = 0): Promise<R | null> {
        bug(`[FETCHING]: ${url} with`, options);
        const fe = fetch(url, options?.method || "GET")
        if (is.object(options, true)) {
            if (options.cookie && is.string(this.cookie)) {
                const Cookie = this.cookie.replace(/%TIME_REPLACE%/gi, new Date().toLocaleString());
                if (is.object(options.headers)) {
                    options.headers["Cookie"] = Cookie;
                } else {
                    options.headers = { Cookie };
                }
            }
            if (is.object(options.headers, true)) {
                fe.header(options.headers);
            }
            if (is.object(options.body, true)) {
                fe.body(options.body, "json");
            }
        }
        const r = await fe.send().catch(noop);
        if (!r) {
            bug(`Got 'null' while requesting (${options?.method || "GET"}) | ${url}`);
            return null;
        }
        bug(`[FETCHED]: Got (${r.statusCode}) status for ${url}`, r.statusCode !== 200 ? r.json() : "", r.headers);
        if (r.statusCode === 200) {
            return r.json() as R | null;
        }
        if (r.statusCode === 429) {
            await sleep(get.secs(5));
            return await this.#fetch(url, options, retries + 1);
        }
        return null;
    }

    #getLink(name: keyof RobloxOptions, id: StrNum, url?: string) {
        return (url || this.options[name] || "").replace(/%userid%/gi, `${id}`) || "";
    }

    async #fetchUsers<B extends AnyPOSTUsersAPIResponse, T = unknown>(endpoint: `/${string}`, body: T): Promise<B | null> {
        return (await this.#fetch<B, T>(`https://users.roblox.com/v1${endpoint}`, {
            method: "POST",
            body,
        }));
    }
}