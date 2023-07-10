module.exports = class Base {
    /**
     * @param {import("discord.js").Client} client 
     * @param {import("@elara-services/logging").BaseEventOptions} options
     */
    constructor(client, options = {}) {
        this.client = client;
        this.enabled = typeof options?.enabled === 'boolean' ? options.enabled : true;
        this.name = options?.name || "";
        this.emitter = options?.emitter || "client";
        this.logger = null;
    };

    async run() {
        throw new Error(`No run function for ${this.constructor.name}`);
    }
};