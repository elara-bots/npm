let [ fetch, listening ] = [
    require("@elara-services/fetch"),
    false
];
class Levels {
    /**
     * @param {import("discord.js").Client} client 
     */
    constructor(client, url = "", log = true) {
        this.client = client;
        this.url = url;
        this.data = new Map();
        this.users = new Set();
        this.log = log;
        this.levels = new Map();
    };

    async register(guildId, levels, stack = false) {
        if (!this.url) throw new Error(`No leaderboard DB set!`);
        if (listening) return;
        this.levels.set(guildId, { levels, stack });
        listening = true;
        await this.fetch(guildId);
        setInterval(() => this.fetch(guildId), 10 * 60000);
        setInterval(() => this.users.clear(), 60000)
        this.client
        .on("messageCreate", async (message) => {
            if (message.author.bot || message.guildId !== guildId) return;
            if (!message.guild?.me?.permissions?.has?.("MANAGE_ROLES")) return;
            return this.updateUser(message);
        });
    };

    async updateUser(message) {
        let lb = this.levels.get(message.guild.id);
        if (!lb) return `There is no levels or stack set`;
        const { levels, stack } = lb;
        if (this.users.has(message.author.id)) return `The user is in a cooldown.`;
        this.users.add(message.author.id);
        let find = this.data.get(message.guild.id)?.find?.(c => c.id === message.author.id)
        if (!find) return `The user isn't found in the leaderboard`;
        let level = levels.find(c => c.level === find.level);
        if (!level) return `They haven't leveled up yet.`;
        if (message.member.roles.cache.has(level.role)) return `They already have the levelup role!`;
        let roles = [ ...message.member.roles.cache.keys(), level.role ];
        if (!stack) {
            let stackedRoles = levels.filter(c => c.level < level.level).map(c => c.role);
            if (stackedRoles.length) roles = roles.filter(c => !stackedRoles.includes(c));
        };
        return message.member.edit({ roles }, `Level up!`)
        .then(() => {
            let str = `[LEVELUP:SUCCESS]: Guild (${message.guild.id}) | Member ${message.member.user.tag} (${message.member.id})`
            this.log ? console.log(str) : null;
            return str
        })
        .catch(err => {
            let str = `[LEVELUP:ERROR]: GUILD (${message.guild.id}) | MEMBER ${message.member.user.tag} (${message.member.id})`;
            console.log(str, err)
            return str;
        });

    };

    format(data) {
        if (!data) return null;
        return { username: data[5], id: data[0], avatar: data[6], level: data[1] }
    };

    async fetch(guildId) {
        if (!this.url) throw new Error(`No leaderboard DB set!`);
        try {
            let res = await fetch(this.url.replace(/%ID%/gi, guildId))
                .send()
                .catch(() => ({ statusCode: 500 }));
        
            let json = res.json();
            if (res.statusCode !== 200 || !json?.level?.length) {
                console.warn(`[LEVELS:FETCH]: I was unable to fetch the list for: ${guildId}`);
                return false;
            }
            this.data.set(guildId, json.level?.map?.(c => this.format(c)));
            return true;
        } catch (err) {
            console.warn(`[LEVELS:FETCH]: I was unable to fetch the list for ${guildId}`, err);
            return false;
        }
    };
};

exports.Levels = Levels;