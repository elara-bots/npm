const { EventEmitter } = require("events");
const { fetchPosts, isValid, time } = require("./util");

exports.Reddit = class Reddit {
    constructor() {
        this.emiiter = new EventEmitter();
        this.announced = new Set();
        this.data = { users: new Set(), subs: new Set() };
        this.searchTime = { users: 1, subs: 2 };
        this.enabled = { users: true, subs: true };
    };

    /**
     * @param {'searching' | 'user' | 'subreddit'} event 
     * @param {Function} listener 
     * @returns {this}
     */
    listen(event, listener) {
        if (![ 'searching', 'user', 'subreddit' ].includes(event.toLowerCase())) return this;
        this.emiiter.on(event.toLowerCase(), listener);
        return this;
    }

    /**
     * @param {number} minutes 
     * @param {'subs' | 'users'} type 
     * @returns {this}
     */
    setSearch(minutes = 5, type = "subs") {
        if (![ "subs", "users" ].includes(type.toLowerCase())) throw new Error(`Search time for: ${type} doesn't exist!`);
        this.searchTime[type.toLowerCase()] = minutes;
        return this;
    };

    /**
     * @param {boolean} bool 
     * @param {'subs' | 'users'} type 
     * @returns 
     */
    setEnabled(bool, type = "subs") {
        if (typeof this.enabled[type] !== 'boolean') throw new Error(`Enabled name for: ${type} doesn't exist!`);
        this.enabled[type] = bool;
        return this;
    };
    
    get users() {
        return {
            add: async (name, skipValidator = false) => {
                if (skipValidator) {
                    this.data.users.add(name);
                    return name;
                }
                const res = await isValid(name, "u");
                if (!res.status) throw new Error(`The user (${name}) wasn't found on Reddit!`);
                if (this.data.users.has(name)) throw new Error(`The user (${name}) is already in the 'users' list!`);
                this.data.users.add(name);
                return res.data;
            },

            remove: async (name, skipValidator = false) => {
                if (skipValidator) {
                    this.data.users.delete(name);
                    return name;
                }
                const res = await isValid(name, "u");
                if (!res.status) throw new Error(`The user (${name}) wasn't found on Reddit!`);
                if (!this.data.users.has(name)) throw new Error(`The user (${name}) isn't in the 'users' list!`);
                this.data.users.delete(name);
                return res.data;
            },

            list: () => [ ...this.data.users.values() ],

            bulk: (names = [], skipValidator = true) => {
                for (const name of names) this.users.add(name, skipValidator);
                return this;
            }
        }
    };

    get subs() {
        return {
            add: async (name, skipValidator = false) => {
                if (skipValidator) {
                    this.data.subs.add(name);
                    return name;
                }
                const res = await isValid(name);
                if (!res.status) throw new Error(`The sub (${name}) wasn't found on Reddit!`);
                if (this.data.subs.has(name)) throw new Error(`The sub (${name}) is already in the 'subs' list!`);
                this.data.subs.add(name);
                return res.data;
            },

            remove: async (name, skipValidator = false) => {
                if (skipValidator) {
                    this.data.subs.delete(name);
                    return name;
                }
                const res = await isValid(name);
                if (!res.status) throw new Error(`The sub (${name}) wasn't found on Reddit!`);
                if (!this.data.subs.has(name)) throw new Error(`The sub (${name}) isn't in the 'subs' list!`);
                this.data.subs.delete(name);
                return res.data;
            },

            list: () => [ ...this.data.subs.values() ],

            bulk: (names = [], skipValidator = true) => {
                for (const name of names) this.subs.add(name, skipValidator);
                return this;
            }
        }
    };

    async run() {
        /**
         * @param {string[]} data 
         * @param {string} type
         * @param {string} event
         */
        const handle = async (data, type = "r", event) => {
            const timer = () => setTimeout(() => handle(data, type, event), this.searchTime[data] * 60000)
            if (!this.enabled[data]) return timer();
            const list = [ ...this.data[data].values() ];
            this.emiiter.emit("searching", list, event);
            for (const d of list) {
                const res = await fetchPosts(`${type}/${d}`);
                if (res.length) {
                    for (const r of res) {
                        if ((time(r.created_utc) - (this.searchTime[data] - 1)) > this.searchTime[data]) continue;
                        if (this.announced.has(r.id)) continue;
                        r.created_format = time(r.created_utc, "d[d], h[h], m[m], s[s]", false);
                        r.postURL = `https://www.reddit.com${r.permalink}`;
                        this.announced.add(r.id);
                        this.emiiter.emit(event, type === "r" ? r.subreddit : r.author, r);
                    }
                }
            }
            return timer();
        };

        if (this.data.users.size) handle("users", "user", "user");
        if (this.data.subs.size)  handle("subs", "r", "subreddit");
    };
};

exports.util = { fetchPosts, isValid, time };