const [
    { validateURL, error, limits, resolveColor, status, url },
    { REST, makeURLSearchParams }
] = [
    require("./util/util"),
    require("@discordjs/rest")
],
    rest = new REST();

module.exports = class Webhook {
    constructor(url, options = { username: "", avatar_url: "", threadId: "" }) {
        if (!validateURL(url)) return error(`You didn't provide any webhook url or you provided an invalid webhook url`);
        this.url = url;
        this.helpers = { blank: "\u200b" };
        if (typeof options !== "object") options = { username: "", avatar_url: "", threadId: "" }
        this.data = {
            username: options.username || undefined,
            avatar_url: options.avatar_url || undefined,
            embeds: [],
            content: undefined,
            components: [],
            thread_id: options.threadId || undefined
        };
    };

    author(username = "", avatar = "") {
        if (username && typeof username === "string" && username.length >= 2) this.data.username = username.slice(0, limits.username)
        if (avatar && avatar.match(/https?:\/\//gi)) this.data.avatar_url = avatar;
        return this;
    }

    mention(text = "") {
        if (typeof text !== "string" || !text.match(/<@(!|&)?/gi)) return this;
        this.data.content = `${text}${this.data.content ? `, ${this.data.content}` : ""}`;
        return this;
    };
    /**
     * @deprecated This method is deprecated, use the '.author("Name", "Avatar_URL")' method!
     */
    username(name = "") {
        if (typeof name !== "string") return this;
        if (name.length < 1) return this;
        if (name.length > limits.username) name = name.slice(0, limits.username);
        this.data.username = name;
        return this;
    };
    /**
     * @deprecated This method is deprecated, use the '.author("Name", "Avatar_URL")' method!
     */
    avatar(url = "") {
        if (!url || !url.match(/https?:\/\//gi)) return this;
        this.data.avatar_url = url;
        return this;
    };
    /**
     * @deprecated This method is deprecated, use the '.author("Name", "Avatar_URL")' method!
     */
    both(name = "", avatar = "") {
        this.author(name, avatar);
        return this;
    }
    content(text = "") {
        if (typeof text !== "string") return this;
        if (text.length > limits.content) text = text.slice(0, limits.content);
        if (this.data.content) this.data.content = this.data.content += text;
        else this.data.content = text;
        return this;
    };
    embed(embed) {
        if (this.data.embeds.length > 10) return this;
        if ("color" in embed && typeof color === "string") embed.color = resolveColor(embed.color)
        this.data.embeds.push(embed);
        return this;
    };
    embeds(embeds = []) {
        for (const embed of embeds) this.embed(embed);
        return this;
    };
    buttons(data = []) {
        for (const d of data) this.button(d);
        return this;
    };
    button(data) {
        this.data.components.push(data);
        return this;
    };

    field(name, value, inline = false) {
        if (!name) name = this.helpers.blank;
        if (!value) value = this.helpers.blank;
        return { name, value, inline };
    };

    async send(force = false, authorization = "") {
        if (authorization) rest.setToken(authorization);
        force = Boolean(force);
        if (!this.data.content && !this.data.embeds.length && !this.data.components.length) return error(`You didn't add anything to be sent.`)
        const Url = url(this.url);
        let r = await rest.post(`/${Url.path}`, { auth: false, body: this.data, query: makeURLSearchParams({ wait: true, thread_id: this.data.thread_id || Url.thread_id }) })
            .then(r => status(true, r))
            .catch(e => error(e))
        if (!r.status) return error(r.data);
        return r.data;
    };

    async edit(messageID) {
        if (!messageID) return error(`You didn't provide a message ID`);
        if (!this.data.content && !this.data.embeds.length && !this.data.components.length) return error(`You didn't add anything to be sent.`)
        const Url = url(this.url);
        if (!Url || !Url.path) return error(`You didn't provide a valid webhook?`);
        return await rest.patch(`/${Url.path}/messages/${messageID}`, { body: this.data, auth: false, query: makeURLSearchParams({ wait: true, thread_id: this.data.thread_id || Url.thread_id }) })
        .then(r => status(true, r))
        .catch(e => error(e));
    }
};