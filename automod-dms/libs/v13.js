const Base = require("./base");
const { Intents } = require("discord.js");

module.exports = class V13 extends Base {
    /**
     * @param {import("./base").AutoModDMNotificationsOptions} options 
     */
    constructor(options) {
        super(options);
    }

    run() {
        return this.handleRun(Intents);
    }
};