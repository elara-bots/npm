const twit = require("twitter-lite");
const { EventEmitter } = require("events");
const Webhook = require("discord-hook");


/**
 * @typedef {Object} AddUserData
 * @property {string} id - [REQUIRED]: The Twitter user's ID
 * @property {string|number} color - [NOT_REQUIRED]: The color of the embed for posts.
 * @property {string[]} webhooks - [REQUIRED]: An array of webhooks for the user to be announced to
 * @property {string[]} ignoreText - [NOT_REQUIRED]: Should ignore the tweet if it contains the text provided in this array.
 */


class Twitter extends EventEmitter {
    constructor({ 
        timeout, sendDefaultAnnouncement = false, 
        consumer_key, consumer_secret, 
        access_token_key, access_token_secret 
    } = {}){
        if(!timeout || isNaN(timeout)) throw new Error(`You didn't provide a timeout, in seconds.`);
        if (!consumer_key || !consumer_secret || !access_token_key || !access_token_secret) throw new Error(`You failed you provide one of the following, "consumer_key, consumer_secret, access_token_key, access_token_secret"`)
        super()
        this.sendDefaultAnnouncement = sendDefaultAnnouncement;
        this.data = [];
        this.ids = []; 
        this.twitter = new twit({ 
            consumer_key, consumer_secret, access_token_key, access_token_secret,
            timeout_ms: timeout * 1000, 
        });

        /** @type {import("twitter-lite").Stream|null} */
        this.stream = null;
    };

    /**
     * @param {AddUserData} options
     * @returns {this}
     */
    addUser({ id, color, webhooks, ignoreText } = {}) {
        let data = {};
        if (id && typeof id === "string") data.id = id;
        if (color && [ "string", "number" ].includes(typeof color)) data.color = color;
        if (Array.isArray(webhooks) && webhooks.length) data.webhooks = webhooks;
        if (Array.isArray(ignoreText) && ignoreText.length) data.ignoreText = ignoreText;
        if (!("id" in data) && !("webhooks" in data)) return this;
        if (!this.data.find(c => c.id === id)) this.data.push(data);
        if (!this.ids.includes(id)) this.ids.push(id);
        return this;
    };

    /**
     * @param {AddUserData[]} users 
     * @returns {this}
     */
    addUsers(users = []) {
        for (const user of users) this.addUser(user);
        return this;
    };

    html(str) {
        return String(str)
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/(&#(\d+);)/g, (m, c, charCode) => String.fromCharCode(charCode));
    };

    /**
     * @returns {this}
     */
    async start(){
        if(!this.data.length) {
            console.warn(`You didn't provide any data, use .addUser() to add users to the system.`);
            return this;
        }
        if(this.stream) {
            await this.stream?.destroy?.();
            this.stream = null;
        };
        this.stream = this.twitter.stream("statuses/filter", { follow: this.ids })

        this.stream
        .on("start", () => this.emit(`stream:start`))
        .on("error", (e) => this.emit("stream:error", e))
        .on("end",   (r) => this.emit("stream:end", r))
        .on("data", d => {
            if(!d || !d.user) return Promise.resolve(null);
            if(!this.ids.includes(d.user.id_str)) return Promise.resolve(null);
            const userData = this.data.find(c => c.id === d.user.id_str);
            if (!userData) return Promise.resolve(null);
            this.emit(`stream:post`, d, userData);
            if (this.sendDefaultAnnouncement) this.sendDefault(d, userData);
            return Promise.resolve();
        })

        return this;
    };

    /**
     * @param {object} data 
     * @param {string[]} find 
     */
    async sendDefault(data, find){
        if(!data || !find || !find.webhooks?.length) return Promise.reject(`No data or find given.`);
        let body = this.fetchData(data, find);
        if (!body) return Promise.reject(`No data returned.`);
        let embeds = [
            {
                url: body.url,
                title: `${body.username} (\`${body.fullName}\`)`,
                description: body.formatedText,
                color: body.color,
                thumbnail: { url: body.avatar },
                timestamp: body.timestamp,
                fields: [ { name: `\u200b`, value: `[View Tweet](${body.url} "Click here to view the tweet!")` } ],
                author: { name: `Twitter`, icon_url: `https://cdn.discordapp.com/emojis/731088007318208551.png?v=1`, url: body.url }
            }
        ];
        if (body.images?.length) {
            if (body.images.length === 1) embeds[0].image = { url: body.images[0] };
            else for (const img of body.images.slice(0, 4)) embeds.push({ url: body.url, image: { url: img } });
        }
        for (const webhook of body.webhooks) this.send({ webhook, username: body.username, avatar_url: body.avatar, embeds });
        return Promise.resolve(`Sending the announcements`);
    };

    /**
     * @param {object} data 
     * @param {object} find
     * @param {?string|number} [find.color]
     * @param {?string[]} [find.webhooks]
     * @param {?string[]} [find.ignoreText]
     */
    fetchData(data, find){
        if (!data) return null;
        let text = data.text ? this.html(data.text) : "";
        if (data?.extended_tweet?.full_text) text = this.html(data.extended_tweet.full_text);
        if (Array.isArray(find.ignoreText) && find.ignoreText.length) {
            if (ignoreText.some(c => text.toLowerCase().includes(c.toLowerCase()))) return null;
        }
        let _data = {
            url: `https://twitter.com/${data.user.screen_name}/status/${data.id_str}`,
            text,
            formatedText: text,
            color: find?.color ?? 0x1DA1F2,
            timestamp: new Date(data.created_at),
            avatar: data.user.profile_image_url_https.replace("_normal", "_200x200"),
            username: data.user.name,
            fullName: data.user.screen_name,
            images: [],
            webhooks: find?.webhooks ?? [],
            raw: data
        };
        if(data.extended_entities?.media?.length) _data.images.push(...data.extended_entities.media.map(c => c.media_url_https));
        if (data.entities.hashtags.length) for (const tag of data.entities.hashtags) _data.formatedText = _data.formatedText.replace(new RegExp(`#${tag.text}`, `g`), `[#${tag.text}](https://twitter.com/hashtag/${tag.text})`);
        if (data.entities.user_mentions.length)  for (const user of data.entities.user_mentions) _data.formatedText = _data.formatedText.replace(new RegExp(`@${user.screen_name}`, `g`), `[@${user.name}](https://twitter.com/${user.screen_name})`);
        return _data;
    };


    async fetchUser(screen_name) { 
        return this.twitter.get("users/lookup", { screen_name })
    };

    /**
     * @param {object} options
     * @param {string} [options.webhook]
     * @param {string} [options.username]
     * @param {string} [options.avatar_url]
     * @param {import("discord-hook")['data']['embeds']} [options.embeds]  
     * @param {string} [options.content]
     * @param {import("discord-hook")['data']['components']} [options.components]
    */
    async send({ webhook, username, avatar_url, embeds, content, components }) {
        const sendWebhook = (hook) => new Webhook(hook, { username, avatar_url }).embeds(embeds).content(content).buttons(components).send()
        .catch(err => {
            if(!err || !err.stack) return null;
            this.emit(`webhook:error`, err);
        })
        if (Array.isArray(webhook) && webhook.length) return await Promise.all(webhook.map(c => sendWebhook(c)));
        return sendWebhook(webhook);
    };

    async restartStream() {
        if (!this.stream) return Promise.reject(`No stream to restart?`);
        Promise.resolve(`I've restarted the stream.`);
        process.nextTick(async () => {
            await Promise.all([
                this.stream.destroy?.(),
                this.start()
            ]);
            this.emit("stream:restart");
        })
    };
};

exports.Twitter = Twitter;