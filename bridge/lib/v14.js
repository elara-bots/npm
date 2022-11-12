const Base = require("./base");
const { IntentsBitField, Client } = require("discord.js");

module.exports = class V14 extends Base {
    /**
     * @param {Client} client
     * @param {import("@elara-services/bridge").BridgeOptions} options 
     */
    constructor(client, options) {
        super(client, options);
    }

    run() {
        return this.handleRun(IntentsBitField);
    }
};