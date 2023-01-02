const [moment, fetch, pack, formatDate, formatNum, { EventEmitter }, { Messages }, bool, status] = [
    require("moment"),
    require("@elara-services/fetch"),
    require(`../package.json`),
    (date, format = "f") => `<t:${Math.floor(new Date(date).getTime() / 1000)}${format ? `:${format}` : ""}>`,
    (num) => num.toLocaleString(),
    require("events"),
    require("./messages"),
    (s, def = true) => typeof s === "boolean" ? s : def,
    (message, status = false) => ({ status, message })
];


module.exports = class Roblox {
    /**
     * @param {object} [options] 
     * @param {string} [options.cookie]
     * @param {boolean} [options.debug]
     * @param {string} [options.avatarUrl]
     * @param {object} [options.apis]
     * @param {boolean} [options.apis.rover]
     * @param {boolean} [options.apis.bloxlink]
     * @param {boolean} [options.apis.rowifi]
     * @param {boolean} [options.apis.rocord]
     * @param {boolean} [options.apis.rolinkapp]
     * @param {object} [options.keys]
     * @param {string} [options.keys.rover]
     * @param {string} [options.keys.bloxlink]
     * @param {string} [options.keys.rocord]
     * @param {string} [options.keys.rolinkapp]
     */
    constructor(options = {}) {
        this.rover = bool(options?.apis?.rover);
        this.bloxlink = bool(options?.apis?.bloxlink);
        this.rowifi = bool(options?.apis?.rowifi);
        this.rocord = bool(options?.apis?.rocord);
        this.rolinkapp = bool(options?.apis?.rolinkapp);
        this.keys = options?.keys ?? { bloxlink: null, rover: null, rocord: null, rolinkapp: null };
        this.debug = Boolean(options?.debug ?? false);
        this.options = options;
        if ("avatarUrl" in options) {
            if (!options.avatarUrl.includes("%USERID%")) throw new Error(Messages.ERROR(`You forgot to include '%USERID%' in the avatarUrl field.`));
        }
        this.events = new EventEmitter();
    };
    emit(event, ...args) { return this.events.emit(event, ...args); };

    async get(user, basic = false, guildId = null, include) {
        if (typeof user === "string" && user.match(/<@!?/gi)) {
            let r = await this.services.get(user.replace(/<@!?|>/gi, ""), basic, guildId, include);
            if (!r?.status) return status(r?.message ?? Messages.NO_ROBLOX_PROFILE);
            return r;
        } else {
            let s = await (isNaN(parseInt(user)) ? this.fetchByUsername(user) : this.fetchRoblox(parseInt(user)));
            if (!s?.status) return status(s?.message ?? Messages.NO_ROBLOX_PROFILE);
            return s;
        };
    };

    /**
     * @param {string} name 
     * @param {boolean} basic
     * @returns {Promise<object|null>}
     */
    async fetchByUsername(name, basic = false) {
        let res = await this._request(`https://api.roblox.com/users/get-by-username?username=${name}`);
        if (!res || !res.Id) return null
        if (basic) return this.fetchBasicRobloxInfo(res.Id);
        return this.fetchRoblox(res.Id);
    };

    /**
     * @param {string} id 
     * @returns {Promise<object>}
     */
    async fetchBasicRobloxInfo(id, service = "Unknown") {
        let res = await this.privateFetch(`https://users.roblox.com/v1/users/${id}`);
        if (!res) return status(Messages.NO_ROBLOX_PROFILE);
        return { status: true, service, ...res };
    }

    /**
     * @param {string|number} id 
     * @returns {Promise<object|null>}
     */
    async fetchRoblox(id, service = "Unknown") {
        try {
            let [newProfile, userReq, g, activity] = await Promise.all([
                this.privateFetch(`https://www.roblox.com/users/profile/profileheader-json?userId=${id}`),
                this.privateFetch(`https://users.roblox.com/v1/users/${id}`),
                this.privateFetch(`https://groups.roblox.com/v1/users/${id}/groups/roles`),
                // TODO: Replace this with the new API, once they fix it
                this.privateFetch(`https://api.roblox.com/users/${id}/onlinestatus`)
            ])
            if (!userReq) return status(Messages.NO_ROBLOX_PROFILE);
            if (!g) g = [];
            let [bio, joinDate, pastNames, userStatus, friends, followers, following, groups] = [
                null, "", "", "Offline", 0, 0, 0, []
            ]
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
    };

    /**
     * @param {string|number} user 
     * @returns {Promise<boolean>}
     */
    async isVerified(user) {
        let r = await this.get(user, true);
        if (r?.status !== true) return Promise.resolve(false);
        return Promise.resolve(true);
    };

    /**
     * @private
     * @param {string} url 
     * @param {object} headers 
     * @param {string} method 
     * @param {boolean} returnJSON 
     * @returns {Promise<object|null|any>}
     */
    async _request(url, headers = undefined, method = "GET", returnJSON = true) {
        try {
            let body = fetch(url, method)
            if (headers) body.header(headers)
            let res = await body.send().catch(() => ({ statusCode: 500 }));
            this._debug(`Requesting (${method}, ${url}) and got ${res.statusCode}`);
            if (res.statusCode !== 200) return null;
            return res[returnJSON ? "json" : "text"]();
        } catch (err) {
            this._debug(`ERROR while making a request to (${method}, ${url}) `, err);
            return null;
        }
    };

    /**
     * @private
     */
    _debug(...args) {
        if (!this.debug) return;
        return console.log(`[${pack.name.toUpperCase()}, v${pack.version}]: `, ...args);
    }

    /**
     * @private
     * @param {string} [url]
     * @returns {Promise<object|void>}
     */
    async privateFetch(url = "") { return this._request(url, this.options.cookie ? { "Cookie": this.options.cookie.replace(/%TIME_REPLACE%/gi, new Date().toLocaleString()) } : undefined); };

    /**
     * @param {object} res - Information from the Roblox.js response
     * @param {object} user - Discord.js user class
     * @param {object} [options]
     * @param {boolean} [options.showButtons=true] - Show the link buttons for Profile and Avatar
     * @param {string} [options.emoji="▫"] 
     * @param {string} [options.secondEmoji="◽"] 
     * @param {number} [options.color=11701759] - The embed color
     */
    showDiscordMessageData(res, user = null, { showButtons = true, emoji = "▫", secondEmoji = "◽", color = 11701759 } = {}) {
        let fields = [];

        if (res.activity) fields.push( { name: Messages.ACTIVITY, value: `${emoji}${Messages.STATUS}: ${res.activity.LastLocation}${res.activity.PlaceId ? `\n${emoji}${Messages.GAME_URL(`https://roblox.com/games/${res.activity.PlaceId}`)}` : ""}\n${emoji}${Messages.LAST_SEEN}: ${formatDate(res.activity.LastOnline)} (${formatDate(res.activity.LastOnline, "R")})` } )
        if (res.user.bio) fields.push({ name: Messages.BIO, value: res.user.bio.slice(0, 1024) });
        if (res.groups.length) {
            for (const g of res.groups.sort((a, b) => b.primary - a.primary).slice(0, 4)) {
                fields.push({
                    name: `${g.primary ? `[${Messages.PRIMARY}] ` : ""}${g.name}`,
                    value: `${emoji}${Messages.ID}: ${g.id}\n${emoji}${Messages.RANK}: ${g.rank}\n${emoji}${Messages.ROLE}: ${g.role}\n${emoji}${Messages.LINK}: [${Messages.URL}](${g.url})`,
                    inline: g.primary ? false : true
                })
            }
        }

        return {
            embeds: [{
                thumbnail: { url: res.user.avatar }, timestamp: new Date(), fields, color,
                description: [
                    `${emoji}${Messages.USERNAME}: ${res.user.username}`,
                    `${emoji}${Messages.ID}: ${res.user.id}`,
                    `${emoji}${Messages.PAST_NAMES}: ${res.user.lastnames.map(g => `\`${g || "None"}\``).join(", ") || "None"}`,
                    `${emoji}${Messages.JOINED}: ${formatDate(res.user.joined.full, "f")} (${formatDate(res.user.joined.full, "R")})`,
                    `${emoji}${Messages.COUNTS}:`,
                    `${secondEmoji}${Messages.GROUPS}: ${formatNum(res.groups.length)}`,
                    `${secondEmoji}${Messages.FRIENDS}: ${formatNum(res.user.counts.friends)}`,
                    `${secondEmoji}${Messages.FOLLOWERS}: ${formatNum(res.user.counts.followers)}`,
                    `${secondEmoji}${Messages.FOLLOWING}: ${formatNum(res.user.counts.following)}`,
                ].join("\n"),
                author: Messages.AUTHOR(user, res),
                footer: Messages.FOOTER(res.groups.length > 4)
            }],
            components: showButtons && [
                { type: 1, components: [
                    { type: 2, style: 5, label: Messages.PROFILE, url: res.user.url, emoji: { id: "411630434040938509" } },
                    { type: 2, style: 5, label: Messages.AVATAR, url: res.user.avatar, emoji: { id: "719431405989396530" } }
                ]}
            ]
        }
    };

    get services() {
        return {
            getDefaults: (include = {}) => {
                let def = {
                    rover: true,
                    bloxlink: true,
                    rowifi: true,
                    rocord: true,
                    rolinkapp: true,
                };
                if (!this.rocord || !this.keys.rocord || include?.rocord) def.rocord = false;
                if (!this.rover || include?.rover) def.rover = false;
                if (!this.bloxlink || !this.keys.bloxlink || include?.bloxlink) def.bloxlink = false;
                if (!this.rowifi || include?.rowifi) def.rowifi = false;
                if (!this.rolinkapp || !this.keys.rolinkapp || include?.rolinkapp) def.rolinkapp = false;
                return def;
            },
            
            rocord: async (id, basic = false) => {
                if (!this.rocord && !this.keys.rocord) return status(Messages.DISABLED(Messages.ROCORD));
                let r = await this._request(`https://rocord.elara.services/api/users/${id}`, { authorization: this.keys.rocord });
                if (!r) {
                    this.emit("failed", id, "rocord");
                    return status(Messages.DISABLED(Messages.ROCORD));
                }
                this.emit("fetch", id, "rocord");
                if (basic) return this.fetchBasicRobloxInfo(r.id, Messages.ROCORD);
                return this.fetchRoblox(r.id, Messages.ROCORD);
            },

            rover: async (id, basic = false) => {
                if (!this.rover) return status(Messages.DISABLED(Messages.ROVER));
                let r = await this._request(`https://verify.eryn.io/api/user/${id}`);
                if (r?.status !== "ok") {
                    this.emit("failed", id, "rover");
                    return status(Messages.DISABLED(Messages.ROVER));
                }
                this.emit("fetch", id, "rover");
                if (basic) return this.fetchBasicRobloxInfo(r.robloxId, Messages.ROVER);
                return this.fetchRoblox(r.robloxId, Messages.ROVER);
            },

            rowifi: async (id, basic = false) => {
                if (!this.rowifi) return status(Messages.DISABLED(Messages.ROWIFI));
                let r = await this._request(`https://api.rowifi.link/v1/users/${id}`);
                if (!r?.success) {
                    this.emit("failed", id, "rowifi");
                    return status(Messages.NOT_VERIFIED(Messages.ROWIFI));
                }
                this.emit("fetch", id, "rowifi");
                if (basic) return this.fetchBasicRobloxInfo(r.roblox_id, Messages.ROWIFI);
                return this.fetchRoblox(r.roblox_id, Messages.ROWIFI);
            },

            bloxlink: async (id, basic = false, guildId) => {
                if (!this.bloxlink && !this.keys.bloxlink) return status(Messages.DISABLED(Messages.BLOXLINK));
        
                let r = await this._request(`https://v3.blox.link/developer/discord/${id}${guildId ? `?guildId=${guildId}` : ""}`, { "api-key": this.keys.bloxlink });
                if (!r?.success || typeof r.user?.primaryAccount !== "string") {
                    this.emit("failed", id, "bloxlink");
                    return status(Messages.DISABLED(Messages.BLOXLINK));
                }
                this.emit("fetch", id, "bloxlink");
                if (basic) return this.fetchBasicRobloxInfo(r.primaryAccount || r.user?.primaryAccount, Messages.BLOXLINK);
                return this.fetchRoblox(r.primaryAccount || r.user?.primaryAccount, Messages.BLOXLINK)
            },

            rolinkapp: async (id, basic = false) => {
                if (!this.rolinkapp && !this.keys.rolinkapp) return status(Messages.DISABLED(Messages.ROLINKAPP));

                let r = await this._request(`https://rolink.app/api/roblox/${id}`, {
                    "Authorization": this.keys.rolinkapp
                });
                if (r.statusCode !== 200 || r.error || !r.data?.roblox?.accounts?.[0]?.robloxId) {
                    this.emit("failed", id, "rolinkapp");
                    return status(Messages.NOT_VERIFIED(Messages.ROLINKAPP));
                };
                this.emit("fetch", id, "rolinkapp");
                if (basic) return this.fetchBasicRobloxInfo(r.data.roblox.accounts[0].robloxId, Messages.ROLINKAPP);
                return this.fetchRoblox(r.data.roblox.accounts[0].robloxId, Messages.ROLINKAPP);
            },

            get: async (id, basic = false, guildId, include = {}) => {
                let defs = this.services.getDefaults(include);
                if (defs.rocord) return this.services.rocord(id, basic);
                if (defs.rover) return this.services.rover(id, basic);
                if (defs.rowifi) return this.services.rowifi(id, basic);
                if (defs.bloxlink) return this.services.bloxlink(id, basic, guildId);
                if (defs.rolinkapp) return this.services.rolinkapp(id, basic);
                return status(Messages.NO_ROBLOX_PROFILE);
            }
        }
    }
};