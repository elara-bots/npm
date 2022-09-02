const pack = require("./package.json");
/**
 * @param {any} content 
 */
exports.warn = (...args) => console.warn(`[${pack.name}, v${pack.version}]: `, ...args);

/**
 * @param {import("discord.js").Guild} guild 
 * @param {string} id 
 * @returns {Promise<import("discord.js").GuildMember>}
 */
exports.getMember = async (guild, id) => guild.members.resolve(id) || await guild.members.fetch({ user: id }).catch(() => null) || null