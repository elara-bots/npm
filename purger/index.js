const { DISCORD_INVITE, LINK } = { 
    DISCORD_INVITE: /(discord\.(gg|io|me|li|com)\/.+|discordapp\.com\/invite\/.+|discord\.com\/invite\/.+)/gi, 
    LINK: /http(s)?:\/\//gi  
},
    Utils = require("./utils");

class Purger {
    constructor(channel, amount = 1, cmd = false, maxLimit = 500) {
        this.channel = channel;
        this.amount = Number(amount ?? 1);
        this.cmd = Boolean(cmd ?? false);
        this.maxLimit = maxLimit || 500;
    }

    links(amount) { return this.purge(m => !m.pinned && !m.content?.match(LINK), amount) }

    bots(amount) { return this.purge(m => !m.pinned && m.author.bot, amount) }

    images(amount) { return this.purge(m => !m.pinned && !m.content?.match(LINK) && !m.attachments.size, amount) }

    text(amount) { return this.purge(m => !m.pinned && !m.attachments.size && !m.embeds.length && !m.content?.match(LINK), amount) }

    embeds(amount) { return this.purge(m => !m.pinned && m.embeds.length !== 0, amount); }

    client(amount) { return this.purge(m => !m.pinned && m.author.bot === m.client.user.id, amount) }

    invites(amount) { return this.purge(m => !m.pinned && m.content?.match(DISCORD_INVITE), amount) }

    user(user, amount) { return this.purge(m => !m.pinned && m.author.id === user.id, amount); }

    normal(amount) { return this.purge(m => !m.pinned, amount) }

    contains(content, amount) { return this.purge(m => !m.pinned && m.content?.match(new RegExp(content, "gi")), amount); }

    startsWith(content, amount) { return this.purge(m => !m.pinned && m.content.startsWith(content), amount); }

    async init(filter, user = null, content = "") {
        let amount = this.amount;
        if (amount > this.maxLimit) amount = this.maxLimit;
        const f = (reg, name) => {
            if (filter.match(new RegExp(reg, "i"))) filter = name;
        }
        if (this.cmd && this.channel.client.user.equals(user) && ["user", "users", "member", "members"].includes(filter)) filter = "none";

        if (!filter.match(/text|(link|url)(s)?|embed(s)?|(ro)?bot(s)?|image(s)?|photo(s)?|attachment(s)?|you|invite(s)?|user(s)?|member(s)?|contains|startswith/i)){
            user = this.channel.client.users.resolve(filter.replace(/<@!?|>/gi, "")) || await this.channel.client.users.fetch(filter.replace(/<@!?|>/gi, ""), true).catch(() => null);
            if (user) filter = "user"; else filter = "no_filter";
        }
        
        f("member(s)?|user(s)?", "user");
        f("link(s)?|url(s)?", "link");
        f("embed(s)?", "embed");
        f("(ro)?bot(s)?", "bot");
        f("image(s)?|upload(s)?|photo(s)?|attachment(s)?", "image");
        f("invite(s)?", "invite")
        switch(filter.toLowerCase()){
            case "text": return this.text();
            case "link": return this.links();
            case "embed": return this.embeds();
            case "bot": return this.bots();
            case "image": return this.images();
            case "you": return this.client();
            case "invite": return this.invites();
            case "user": return this.user(user);
            case "contains": return this.contains(content);
            case "startswith": return this.startsWith(content);
            default: return this.normal(amount)
        }
    }

    async purge(filter, amount) {
        let messages = await this.fetch();
        if (!messages) return Promise.resolve(this.cmd ? null : 0);
        if (!amount || amount <= 0) amount = this.amount; 
        return Utils.deleteMessages(this.channel, messages.filter(filter).map(c => c.id).slice(0, amount))
        .then((m) => this.cmd ? null : m.length)
        .catch(() => this.cmd ? null : 0)
    }

    async fetch() {
        if (!this.channel.permissionsFor(this.channel.client.user.id).has(93184n)) return Promise.resolve(null);
        let amount = 0;
        if (this.amount <= this.maxLimit && this.amount >= 100) amount = this.maxLimit;
        else
        if (this.amount <= 100 && this.amount >= 50) amount = 200;
        else amount = 100;
        let messages = await Utils.fetchMessages(this.channel, amount).catch(() => []);
        if (!messages.length) return Promise.resolve(null);
        return Promise.resolve(messages)
    }
};


exports.Purger = Purger;

exports.Utils = Utils;