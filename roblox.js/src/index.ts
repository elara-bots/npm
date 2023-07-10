import moment from "moment";
import fetch from "@elara-services/fetch";
import pack from "../package.json";
import { timeFormat } from "@elara-services/utils";
import { EventEmitter } from "events";
import type { RobloxOptions, Events, Services, RequestMethod, SearchUser, RobloxGroup, FetchedUser } from "./interfaces";
import { bool, num, status } from "./utils";
import { Messages } from "./messages";

export class Roblox {
    private events: EventEmitter;
    private keys: RobloxOptions['keys'];
    private options: RobloxOptions;
    public constructor(options: RobloxOptions) {
        this.keys = this.options.keys;
        this.options = options;
        if ("avatarUrl" in options && options.avatarUrl) {
            if (!options.avatarUrl.includes("%USERID%")) throw new Error(Messages.ERROR(`You forgot to include '%USERID%' in the avatarUrl field.`));
        }
        this.events = new EventEmitter();

    }

    public on(event: Events, listener: (id: string, service: Services) => unknown) {
        return this.events.on(event, listener);
    }

    public async get(user: string, basic = false, guildId: string | null = null, include?: RobloxOptions['apis']) {
        if (typeof user === "string" && user.match(/<@!?/gi)) {
            const r = await this.services.get(user.replace(/<@!?|>/gi, ""), basic, guildId, include);
            if (!r?.status) return status(r?.message ?? Messages.NO_ROBLOX_PROFILE);
            return r;
        } else {
            const s = await (isNaN(parseInt(user)) ? this.fetchByUsername(user) : this.fetchRoblox(parseInt(user)));
            if (!s?.status) return status(s?.message ?? Messages.NO_ROBLOX_PROFILE);
            return s;
        };
    }

    public async fetchByUsername(name: string, basic: boolean = false) {
        const res: { data: SearchUser[] } | null = await this.request(`https://users.roblox.com/v1/users/search?keyword=${encodeURIComponent(name)}&limit=10`);
        if (!res?.data?.length) return null;
        const find = res.data.find((c) => c.name.toLowerCase() === name.toLowerCase());
        if (!find) return null;
        if (basic) return this.fetchBasicRobloxInfo(find.id);
        return this.fetchRoblox(find.id);
    }
    public async fetchBasicRobloxInfo(id: number, service: Services | "Unknown" = "Unknown") {
        const res: FetchedUser | null = await this.privateFetch(`https://users.roblox.com/v1/users/${id}`);
        if (!res) return status(Messages.NO_ROBLOX_PROFILE);
        return { status: true, service, ...res };
    }

    public async fetchRoblox(id: number, service: Services | "Unknown" = "Unknown") {
        try {
            let [newProfile, userReq, g, activity] = await Promise.all([
                this.privateFetch(`https://www.roblox.com/users/profile/profileheader-json?userId=${id}`),
                this.privateFetch(`https://users.roblox.com/v1/users/${id}`),
                this.privateFetch(`https://groups.roblox.com/v1/users/${id}/groups/roles`),
                this.getPresences([ id ]),
            ])
            if (!userReq) return status(Messages.NO_ROBLOX_PROFILE);
            if (!g) g = [];
            let bio: string | null = null;
            let joinDate: string | {
                full: string;
                format: string;
            } = "";
            let pastNames: string = "";
            let userStatus: string = "Offline";
            let [ friends, followers, following ] = [0,0,0];
            const groups: RobloxGroup[] = [];
            if (newProfile) {
                bio = userReq?.description ?? "";
                friends = newProfile.FriendsCount ?? 0;
                followers = newProfile.FollowersCount ?? 0;
                following = newProfile.FollowingsCount ?? 0;
                pastNames = (newProfile.PreviousUserNames.split("\r\n") ?? []).join(", ");
                joinDate = {
                    full: userReq?.created ?? "",
                    format: userReq?.created && moment(userReq.created).format("L") || ""
                };
                userStatus = newProfile.LastLocation ?? "Offline";
            }

            if (g?.data?.length) {
                for (const c of g.data) {
                    if (!c?.group) continue;
                    groups.push({
                        name: c.group.name ?? "",
                        id: c.group.id ?? 0,
                        role_id: c.role?.id,
                        rank: c.role?.rank,
                        role: c.role?.name,
                        members: c.group.memberCount ?? 0,
                        url: `https://roblox.com/groups/${c.group.id ?? 0}`,
                        primary: c.isPrimaryGroup ?? false,
                        inclan: false,
                        emblem: { id: 0, url: "" },
                        owner: c.group.owner ?? null,
                        shout: c.group.shout ?? null,
                        raw: c
                    })
                }
            };
            return {
                status: true,
                service,
                user: {
                    username: userReq.name ?? Messages.UNKNOWN,
                    id: userReq.id ?? 0,
                    online: userStatus ?? Messages.OFFLINE,
                    url: `https://roblox.com/users/${id}/profile`,
                    avatar: (this.options.avatarUrl || pack.links.AVATAR).replace(/%userid%/gi, userReq.id),
                    bio, joined: joinDate ?? null,
                    lastnames: pastNames ? pastNames.split(', ').filter(g => g !== "None") : [],
                    counts: { friends, followers, following }
                },
                groups, activity
            }
        } catch (err) {
            return status(Messages.FETCH_ERROR(err));
        }
    }

    public get services() {
        return {
            getDefaults: (include: RobloxOptions['apis']) => {
                const def = {
                    rover: true,
                    bloxlink: true,
                    rowifi: true,
                    rocord: true,
                    rolinkapp: true,
                }
                for (const name of Object.keys(def)) {
                    if (!this.getKey(name) || include?.[name]) {
                        def[name] = false;
                    }
                }
                return def;
            },

            rocord: async (id: string | number, basic = false) => {
                const key = this.getKey("rocord");
                if (!key) {
                    return status(Messages.DISABLED(Messages.ROCORD));
                }
                let r = await this.request(`https://rocord.elara.services/api/users/${id}`, { authorization: key });
                if (!r) {
                    this.emit("failed", id, "rocord");
                    return status(Messages.NOT_VERIFIED(Messages.ROCORD));
                }
                this.emit("fetch", id, "rocord");
                if (basic) return this.fetchBasicRobloxInfo(r.id, Messages.ROCORD);
                return this.fetchRoblox(r.id, Messages.ROCORD as Services);
            }
        }
    }

    private debug(...args: unknown[]) {
        if (!bool(this.options.debug, false)) {
            return;
        }
        return console.log(`[${pack.name.toUpperCase()}, v${pack.version}]: `, ...args);
    }

    private async privateFetch(url = "") { return this.request(url, this.cookieHeader); };

    private async request(url: string, headers: object | undefined = undefined, method: RequestMethod = "GET", returnJSON: boolean = true, data: object | undefined = undefined) {
        try {
            let body = fetch(url, method)
            if (headers) body.header(headers)
            if (typeof data === 'object') body.body(data);
            let res = await body.send().catch(() => ({ statusCode: 500 }));
            this.debug(`Requesting (${method}, ${url}) and got ${res.statusCode}`);
            if (res.statusCode !== 200) return null;
            return res[returnJSON ? "json" : "text"]();
        } catch (err) {
            this.debug(`ERROR while making a request to (${method}, ${url}) `, err);
            return null;
        }
    };

    private emit(event: Events, ...args: unknown[]) {
        this.events.emit(event, ...args);
    }
    private getKey(name: string): string | null {
        if (!bool(this.options.apis?.[name], true)) {
            return null;
        }
        if (!this.options.keys?.[name]) {
            return null;
        }
        return this.options.keys[name];
    }
    private get cookieHeader() { return this.options.cookie ? { "Cookie": this.options.cookie.replace(/%TIME_REPLACE%/gi, new Date().toLocaleString()) } : undefined; };
}