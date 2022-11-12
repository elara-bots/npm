const Base = require("./base");
const { IntentsBitField } = require("discord.js");

module.exports = class V14 extends Base {
    /**
     * @param {import("discord.js").CLient} client
     * @param {import("./base").BridgeOptions} options 
     */
    constructor(client, options) {
        super(client, options);
    }

    run() {
        return this.handleRun(IntentsBitField);
    }
};