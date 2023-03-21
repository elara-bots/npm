const { tweets, user, chunk, isArray, bool, WSEvents, isEqual } = require("./util");
const { ETwitterStreamEvent, TwitterApi } = require("twitter-api-v2");
const { EventEmitter } = require("node:events");
const Webhook = require("discord-hook");
const Refs = {
    replied_to: "repliedTweet",
    retweeted: "retweetedTweet",
    quoted: "quotedTweet"
}

/**
 * @typedef {Object} UserData
 * @property {string} name
 * @property {string[]} webhooks
 * @property {?(string | number)} color
 * @property {?string[]} ignoreText
 * @property {?boolean} displayReplyTweet
 * @property {?boolean} displayRetweetedTweet
 * @property {?boolean} displayQuoteTweet
 * @property {?boolean} useLinkButton
 */


exports.Twitter = class Twitter extends EventEmitter {
    constructor({
        BearerToken = '',
        defaultAnnouncements = false,
        updateRulesOnStart = false,
    } = {}) {
        super();
        if (!BearerToken || typeof BearerToken !== 'string') throw new Error(`You didn't provide any 'BearerToken' to access the stream API`);
        this.defaultAnnouncements = bool(defaultAnnouncements);
        this.updateRulesOnStart = bool(updateRulesOnStart);
        this.data = [];
        this.twitter = new TwitterApi(BearerToken);
        this.api = this.twitter.v2;
        /** * @type {import("twitter-api-v2").TweetStream} */
        this.stream = this.api.getStream("tweets/search/stream", tweets, { timeout: 60000, autoConnect: false });
    };

    async updateStreamRules() {
        if (!this.data.length) throw new Error(`You didn't add any users, use 'addUser' (or addUsers) to do this!`);
        const currentRules = await this.api.streamRules().catch(() => {});
        if (currentRules?.data?.length) await this.api.updateStreamRules({ delete: { ids: currentRules.data.map(c => c.id) } }).catch(() => {});
        let [ add, uNames, i ] = [ [], this.data.map(c => `from:${c.name}`), 0 ];
        if (uNames.join(" OR ").length > 512) for (const c of chunk(uNames, 25)) (i++, add.push({ tag: `users_${i}`, value: c.join(" OR ") }));
        else add.push({ tag: `users`, value: uNames.join(" OR ") });
        return await this.api.updateStreamRules({ add });
    };

    /**
     * @param {UserData} options 
     * @returns {this}
     */
    addUser({ name, color, webhooks, ignoreText, displayQuoteTweet, displayReplyTweet, displayRetweetedTweet, useLinkButton } = {}) {
        if (!name || typeof name !== 'string') throw new Error(`[addUser:ERROR]: The provided 'name' isn't a string or is empty.`);
        if (this.data.find(c => c.name === name)) throw new Error(`[addUser:ERROR]: The provided 'name' is already in the list. (check for duplicates!)`)
        let data = {
            name,
            displayQuoteTweet: bool(displayQuoteTweet, true),
            displayReplyTweet: bool(displayReplyTweet, true),
            displayRetweetedTweet: bool(displayRetweetedTweet, true),
            useLinkButton: bool(useLinkButton, true),
        };
        if (color && [ 'string', 'number' ].includes(typeof color)) data['color'] = color;
        if (isArray(webhooks)) data['webhooks'] = webhooks;
        if (isArray(ignoreText)) data['ignoreText'] = ignoreText;
        this.data.push(data);
        return this;
    };


    /**
     * @param {import("twitter-api-v2").TweetV2SingleStreamResult} data 
     * @param {UserData} find 
     */
    async sendDefault(data, find, returnOnlyData = false){
        if(!data || !find || !isArray(find.webhooks)) return Promise.resolve(`No data or find given.`);
        let body = this.fetchData(data, find, false);
        if (!body) return Promise.resolve(`No data returned.`);
    
        const [ getImages, embeds, embed ] = [ 
            (images) => images.filter(c => c && typeof c === 'string' && [ ".png", ".jpg", ".jpeg", ".webp" ].some(r => c.includes(r))),
            [],
            {
                url: body.url, description: body.formatedText, color: body.color, thumbnail: { url: body.avatar }, timestamp: body.timestamp,
                title: isEqual(body.username, body.fullName) ? body.username :  `${body.username} (\`${body.fullName}\`)`,
                fields: find.useLinkButton ? [] : [ { name: `\u200b`, value: `[View Tweet](${body.url} "Click here to view the tweet!")` } ],
                author: { name: `Twitter`, icon_url: `https://cdn.discordapp.com/emojis/731088007318208551.png?v=1`, url: body.url }
            }
        ];
        /** @type {import("@elara-services/twitter").FormattedData} */
        let t = body.repliedTweet || body.quotedTweet || body.retweetedTweet;
        const addEmbed = (title, iconID, color = null) => {
            const images = getImages(t.images);
            embeds.push({ author: { name: title, icon_url: `https://cdn.discordapp.com/emojis/${iconID || "1077714921917268029"}.png` }, title: isEqual(t.username, t.fullName) ? t.username : `${t.username} (\`${t.fullName}\`)`, url: t.url, description: t.formatedText, timestamp: t.timestamp, image: images.length && { url: images[0] }, color: color || 16777215, thumbnail: { url: t.avatar }, })
        }
        if (body.repliedTweet && find.displayReplyTweet) addEmbed("Replied Tweet"); 
        else if (body.quotedTweet && find.displayQuoteTweet) addEmbed("Quote Tweeted", "1087220413001629796", 0x3496d8); 
        else if (body.retweetedTweet && find.displayRetweetedTweet) addEmbed("Retweeted", "1087220414910046209", 0x1ab99a);

        if (isArray(body.images)) {
            const images = getImages(body.images)
            if (isArray(images)) {
                if (images.length === 1) embeds.push({ ...embed, image: { url: images[0] } });
                else {
                    embeds.push({ ...embed, image: { url: images[0] } });
                    for (const img of images.slice(1, 4)) embeds.push({ url: body.url, image: { url: img } });
                }
            };
        }
        if (!embeds.find(c => c.author?.name === "Twitter")) embeds.push(embed);
        const getData = (webhook) => ({ webhook, username: body.username, avatar_url: body.avatar, embeds, components: find.useLinkButton ? [ { type: 1, components: [ { type: 2, style: 5, url: body.url, label: "View Tweet", emoji: { id: "731088007318208551" } } ] } ] : undefined });
        if (returnOnlyData) return Promise.resolve(body.webhooks.map(c => getData(c)));
        await Promise.all(body.webhooks.map(c => this.send(getData(c))));
        return Promise.resolve(`Sending the announcements`);
    };

    /**
     * @param {import("twitter-api-v2").TweetV2SingleStreamResult} data 
     * @param {UserData} find
     * @param {boolean} [includeRaw]
     */
    fetchData(data, find, includeRaw = true){
        if (!data?.data || !data?.data?.author_id) return null;
        /** @type {import("twitter-api-v2").UserV2} */
        const user = data.includes?.users?.find?.(c => c.id === data.data.author_id);
        if (!user) return null;
        let [ text, tt ] = [ this.html(data.data.text), "" ];
        if (isArray(find.ignoreText) && find.ignoreText.some(c => text.toLowerCase().includes(c.toLowerCase()))) return null;
        let _data = {
            url: `https://twitter.com/${user.username}/status/${data.data.id}`,
            text, formatedText: text, color: find?.color ?? 0x1DA1F2,
            timestamp: new Date(data.data.created_at),
            avatar: user.profile_image_url?.replace?.("_normal", "_200x200") || "",
            username: user.name, fullName: user.username, verified: user.verified,
            verified_type: user.verified && user.verified_type === "none" ? "Legacy" : user.verified_type, images: [],
            webhooks: find?.webhooks ?? [], repliedTweet: null, retweetedTweet: null, quotedTweet: null
        };
        if (includeRaw) _data['raw'] = data;
        if (isArray(data.data.referenced_tweets) && isArray(data.includes?.tweets)) {
            for (const ref of data.data.referenced_tweets) {
                if (!ref) continue;
                let found = data.includes.tweets.find(c => c.id === ref.id);
                if (found && Refs[ref.type]) {
                    const u = data.includes.users?.find(c => c.id === found.author_id);
                    if (u) tt = `https://twitter.com/${u.name}/status/${found.id}`;
                    _data[Refs[ref.type]] = this.fetchData({ ...data, data: found }, { webhooks: [], color: undefined, ignoreText: [] });
                }
            }
        }
        if (isArray(data.includes?.media)) _data.images.push(...data.includes.media.map(c => c.url));
        if (isArray(data.data.entities?.hashtags)) for (const tag of data.data.entities.hashtags) _data.formatedText = _data.formatedText.replace(new RegExp(`#${tag.tag}`, `g`), `[#${tag.tag}](https://twitter.com/hashtag/${tag.tag})`);
        if (isArray(data.data.entities?.mentions)) for (const user of data.data.entities.mentions) _data.formatedText = _data.formatedText.replace(new RegExp(`@${user.username}`, `g`), `[@${user.username}](https://twitter.com/${user.username})`);
        if (data.data.text.includes("https://t.co/") && isArray(data.data.entities?.urls || [])) {
            const find = data.data.entities.urls.filter(c => data.data.text.includes(c.url) && ([ `${_data.url}/photo/1`, _data.url, tt ].includes(c.expanded_url) || c.expanded_url.includes(data.data.referenced_tweets?.[0]?.id)));
            if (find) for (const f of find) _data.formatedText = _data.formatedText.replace(f.url, "");
        }
        if (!_data.formatedText?.length) _data.formatedText = ""; 
        return _data;
    };

    /**
     * @param {string} nameOrId 
     * @param {boolean} isUserId 
     * @param {import("twitter-api-v2").UsersV2Params} query 
     * @returns {Promise<import("twitter-api-v2").UserV2>}
     */
    async fetchUser(nameOrId, isUserId = false, query = null) { 
        if (isUserId) return this.api.user(nameOrId, query || user);
        return this.api.userByUsername(nameOrId, query || user);
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
        if (isArray(webhook)) return await Promise.all(webhook.map(c => sendWebhook(c)));
        return sendWebhook(webhook);
    };

    /**
     * @param {UserData[]} users 
     * @returns {this}
     */
    addUsers(users = []) {
        if (!isArray(users)) return this;
        for (const user of users) this.addUser(user);
        return this;
    };

    /**
     * @param {string} str 
     * @returns {string}
     */
    html(str) {
        return String(str)
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/(&#(\d+);)/g, (m, c, charCode) => String.fromCharCode(charCode));
    };

    /**
     * @returns {Promise<void>}
     */
    async start() {
        if (!this.data.length) throw new Error(`You didn't provide any data, use .addUser to add users to the list.`);
        const start = new Date();
        if (this.updateRulesOnStart) {
            this.emit(WSEvents.DEBUG, { t: WSEvents.DEBUG, d: `Updating stream rules.` })
            await this.updateStreamRules();
        }
        /** @type {import("twitter-api-v2").TweetStream} */
        const stream = await this.stream.connect({ autoReconnect: true, autoReconnectRetries: "unlimited" }).catch(e => e);
        if (stream instanceof Error) throw new Error(`I was unable to start the stream: ${stream}`);
        const listener = (names = [], event) => { 
            for (const n of names) stream.on(n, (...args) => this.emitEvent(event, ...args));
        }
        this.emitEvent(WSEvents.START, { start })
        listener([ ETwitterStreamEvent.Data ], WSEvents.POST);
        if (this.defaultAnnouncements) this.on(WSEvents.POST, (post) => {
            /** @type {import("twitter-api-v2").UserV2} */
            const user = post.includes?.users?.find?.(c => c.id === post.data.author_id);
            if (!user) return null;
            return this.sendDefault(post, this.data.find(c => c.name === user.username));
        })
        listener([ ETwitterStreamEvent.Reconnected, ETwitterStreamEvent.ReconnectAttempt, ETwitterStreamEvent.ReconnectLimitExceeded ], WSEvents.RECONNECT);
        listener([
            ETwitterStreamEvent.ConnectError,
            ETwitterStreamEvent.Error,
            ETwitterStreamEvent.DataError,
            ETwitterStreamEvent.ReconnectError,
            ETwitterStreamEvent.ConnectionError,
            ETwitterStreamEvent.TweetParseError
        ], WSEvents.ERROR)
        
        listener([
            ETwitterStreamEvent.ConnectionLost,
            ETwitterStreamEvent.ConnectionClosed
        ], WSEvents.DISCONNECT)

        return this;
    }

    /**
     * @private
     * @param {string} name 
     * @param {unknown} data 
     * @returns {this}
     */
    emitEvent(name, data) {
        this.emit(WSEvents.DEBUG, { t: name, d: data || null });
        this.emit(name, data);
        this.emit(WSEvents.RAW, { t: name, d: data || null });
        return this;
    };
};

exports.utils = { tweets, user, chunk, isArray, bool, WSEvents }