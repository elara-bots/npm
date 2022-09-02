const Base = require("./base");
const { IntentsBitField } = require("discord.js");

module.exports = class V14 extends Base {
    /**
     * @param {import("./base").AutoModDMNotificationsOptions} options 
     */
    constructor(options) {
        super(options);
    }

    run() {
        return this.handleRun(IntentsBitField);
    }
};