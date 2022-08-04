const { getWebhookInfo, displayMessages, de, webhook } = require("./util"),
      { Interactions: { button, modal } } = require("@elara-services/packages"),
      { WebhookClient } = require("discord.js");

module.exports = class Tickets {
    constructor(options) {
        if (typeof options !== "object") throw new Error(`You didn't provide any data in the constructor, fill it out!`);
        if (!("client" in options) || !("prefix" in options) || !("encryptToken" in options)) throw new Error(`You forgot to fill out either 'client', 'prefix' or 'encryptToken'`)
        this.options = options;
    }
    get prefix() { return `system:ticket:${this.options.prefix}`; };
    get webhookOptions() { return getWebhookInfo(this.options); };
    get getSupportIds() {
        return {
            roles: this.options.support?.roles || [],
            users: this.options.support?.users || []
        }
    }

    /** @private */
    _debug(...args) {
        if (this.options?.debug) console.log(...args);
        return null;
    }

    button(options = { style: 3, label: "Create Ticket", emoji: { name: "📩" } }) {
        return button({ id: options?.id || this.prefix, style: options.style || 3, title: options.label, emoji: options.emoji });
    };

    /**
     * @param {object} options 
     * @param {string} [options.title] The title of the modal submit form 
     * @param {import("@elara-services/packages").Modal['components']} [options.components]
     */
    modal(options = { title: "", components: [] }) {
        return modal({ id: `${this.prefix}:modal_submit`, title: options?.title || "Create Ticket", components: options?.components?.length >= 1 ? options.components : [{ type: 1, components: [{ type: 4, min_length: 10, max_length: 4000, custom_id: "message", label: "Content", style: 2, placeholder: "What's the ticket about?", required: true }] }] })
    };

    async closeTicket({ member, messages, channel, guild, user, reason } = {}) {
        const { id, token, username, avatar: avatarURL } = this.webhookOptions;
        if (!id || !token) return;
        let embeds = [
            {
                author: { name: guild.name, icon_url: guild.iconURL({ dynamic: true }) },
                title: "Ticket: Closed",
                description: `${de.user}User: ${user.toString()} \`@${user.tag}\` (${user.id})\n${de.user}Closed By: ${member.toString()} (${member.id})\n${de.channel}Channel: \`#${channel.name}\` (${channel.id})`,
                color: 0xFF0000,
                fields: reason ? [ { name: "Close Reason", value: reason?.slice?.(0, 1024) ?? "No Reason Provided" } ] : undefined,
                timestamp: new Date(),
                footer: { text: `Ticket ID: ${channel.name.split("-")[1]}` },
            }
        ];
        new WebhookClient({ id, token })
            .send({
                username, avatarURL,
                embeds,
                files: [{ name: "transcript.txt", attachment: Buffer.from(displayMessages(channel, messages.reverse(), channel.name.split("-")[1], this.options.prefix)) }]
            })
            .then(m => {
                let components = [{ type: 2, style: 5, label: "Transcript", emoji: { id: "792290922749624320" }, url: `https://view.elara.workers.dev/tickets?url=${Array.isArray(m.attachments) ? m.attachments?.[0]?.url : m.attachments?.first?.()?.url ?? "URL_NOT_FOUND"}` }];
                embeds[0].description += `\n${de.transcript} Transcript: [View here](${components[0].url})`
                webhook(this.webhookOptions)
                    .embeds(embeds)
                    .button({ type: 1, components })
                    .edit(m.id)
                    .catch(e => this._debug(e));
                if (user) user.send({
                    embeds: [{
                        author: { name: guild.name, icon_url: guild.iconURL({ dynamic: true }) },
                        title: `Ticket: Closed`,
                        color: 0xFF0000,
                        fields: reason ? [ { name: "Close Reason", value: reason?.slice?.(0, 1024) ?? "No Reason Provided" } ] : undefined,
                        timestamp: new Date(),
                        footer: { text: `Ticket ID: ${channel.name.split("-")[1]}` }
                    }],
                    components: [{ type: 1, components }]
                }).catch(e => this._debug(e));
            }).catch(e => this._debug(e));
    };
};