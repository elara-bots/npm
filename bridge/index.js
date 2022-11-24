const { WebhookClient } = require("discord.js");

exports.Bridge = class Bridge {
    /**
     * @param {Client} client 
     * @param {BridgeOptions[]} options 
     */
    constructor(client, options = []) {
        this.client = client;
        this.options = options;
    };

    async run() {
        this.client.on("messageCreate", (m) => this.handleMessageCreate(m));
    };

    /**
     * @param {import("discord.js").Message} m 
     */
    async handleMessageCreate(m) {
        if (!this.options.length) return;
        for (const option of this.options) {
            if (!option.includeAllMessages) {
                if (!m.webhookId || !m.flags.has(1 << 1)) continue;
            }
            if (!option.enabled || !option.webhooks.length) continue;
            if (m.channel?.parentId === option.categoryId) this.send(option, m);
            else if (m.channelId === option.channelId) this.send(option, m);
        }
    };

    /**
     * @param {BridgeOptions} option
     * @param {import("discord.js").Message} message
     */
    async send(option = {}, message) {
        if (!option?.webhooks?.length) return;
        const send = (url) => {
            const Url = new URL(url);
            if (Url.pathname.includes(message.webhookId)) return;
            let username = message.author.discriminator === "0000" ? message.author.username : message.author.tag,
                avatarURL = message.author.displayAvatarURL({ format: "png", extension: "png" });
            if (option?.showMemberProfile && message.member && message.member.displayName !== message.author.username) {
                username = `${message.member.displayName} (${username})`;
                avatarURL = message.member.displayAvatarURL({ format: "png", extension: "png" })
            };
            if (option.username?.length) {
                username = option.username
                    .replace(/{author.name}/gi, message.author.username)
                    .replace(/{author.tag}/gi, message.author.tag)
                    .replace(/{author.id}/gi, message.author.id)
                    .replace(/{member.nickname}/gi, message.member?.displayName || message.author.username)
                    .replace(/{member.tag}/gi, `${message.member?.displayName || message.author.username}#${message.author.discriminator}`)
            }
            if (option.avatarURL?.length && option.avatarURL.startsWith("https://")) avatarURL = option.avatarURL;
            new WebhookClient({ url: `${Url.origin}${Url.pathname}` })
                .send({
                    embeds: message.embeds || undefined,
                    content: message.content || undefined,
                    files: message.attachments.map(c => ({ name: c.name, attachment: c.attachment })),
                    allowedMentions: { parse: [] },
                    username, avatarURL,
                    threadId: Url.searchParams.get("thread_id") || undefined
                })
                .catch(console.warn)
        }
        for (const url of option.webhooks) send(url);
    }
};


/**
 * @typedef {Object} BridgeOptions
 * @property {boolean} enabled
 * @property {string[]} webhooks
 * @property {string} [username]
 * @property {string} [avatarURL]
 * @property {boolean} [includeAllMessages]
 * @property {boolean} [showMemberProfile]
 * @property {string} [channelId]
 * @property {string} [categoryId]
 */