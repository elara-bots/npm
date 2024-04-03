const { emitPackageMessage, log } = require("@elara-services/utils");
const pack = require("./package.json");
const { version } = require("discord.js");

module.exports = (() => {
    if (!version) {
        throw new Error(`[${pack.name}, v${pack.version}]: I was unable to find the discord.js version you're using.`);
    }
    let [major] = version.split(".");
    if (["13", "14"].includes(major)) {
        emitPackageMessage(`${pack.name} - thanks`, () => {
            log(`[${pack.name}, v${pack.version}]: Thanks for using the package!`, `Please support the packages via ${pack.funding.map((c) => c.url).join(" OR ")}`);
        });
        return require(`./lib/v${major}`);
    }
    throw new Error(`[${pack.name}, v${pack.version}]: The discord.js version you're using isn't supported by this package. (currently supported: v13, v14)`);
})();
