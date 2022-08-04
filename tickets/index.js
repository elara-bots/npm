const pack = require("./package.json");

module.exports = (() => {
    let version = null;
    try { version = require("discord.js").version; } catch {}
    if (!version) throw new Error(`[${pack.name}, v${pack.version}]: I was unable to find the discord.js version you're using.`);
    let [ major ] = version.split(".");
    if (major === "14") return require("./lib/v14");
    if (major === "13") return require("./lib/v13");
    if ([ "12", "11" ].includes(major)) throw new Error(`[${pack.name}, v${pack.version}]: The discord.js version you're using is outdated and unsupported, please update to v13+`)
    throw new Error(`[${pack.name}, v${pack.version}]: The discord.js version you're using isn't supported by this package. (currently supported: v13, v14)`);
})();