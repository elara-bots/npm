const { version } = require("discord.js");
const pack = require("./package.json");

const run = () => {
    let [ major ] = version.split(".");
    if (major === "14") return require("./libs/v14");
    if (major === "13") return require("./libs/v13");
    throw new Error(`[${pack.name}, v${pack.version}]: You provided an invalid discord.js version, this package only supports v13 and v14`)
}


exports.AutoModDMNotifications = run();