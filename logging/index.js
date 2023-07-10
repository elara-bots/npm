const { Collection, SnowflakeUtil } = require("discord.js");
const { EventEmitter } = require("node:events");
const { readdirSync } = require("node:fs");

module.exports.Logger = class Logging extends EventEmitter {
    /**
     * @param {import("discord.js").Client} client 
     * @param {LoggingOptions} options 
     */
    constructor(client, options) {
        super()
        this.client = client;
        this.options = options;
        this.auditCache = new Collection();
        this.started = false;
    };

    async run() {
        if (this.started) return;
        this.started = true;
        this.handleCacheRemoval();
    };

    addEventListeners() {
        for (const file of readdirSync("./src/events")) {
            if (file.includes("base")) continue;
            const prop = require(`./src/events/${file}`);
            const ev = new prop(this.client);
            if (!ev.enabled) continue;
            ev.logger = this;
            if (ev.emitter === 'ws') this.client.ws.on(ev.name, (...args) => ev.run(...args));
            else this.client.on(ev.name, (...args) => ev.run(...args));
        }
    }

    handleCacheRemoval() {
        if (this.auditCache.size) {
            for (const cache of this.auditCache.values()) {
                const time = SnowflakeUtil.deconstruct(cache.id).timestamp ?? 0;
                const left = Date.now() - time;
                if (left >= 4_000) {
                    if ('user_id' in cache && cache.user_id === this.client.user.id && left <= 20_000) continue;
                    this.auditCache.delete(cache.id);
                }
            }
        }
        return setTimeout(() => this.handleCacheRemoval(), 6_000);
    }
};

/**
 * @typedef {Object} LoggingOptions
 * @property {boolean} logbots
 */
