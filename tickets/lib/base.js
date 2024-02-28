const { getWebhookInfo, displayMessages, de, getString, generateHTMLPage } = require("./util");
const {
    Interactions: { button },
    ButtonStyle,
} = require("@elara-services/packages");
const { is, status, isV13, embedComment, log } = require("@elara-services/utils");
const { WebhookClient } = require("discord.js");
const { name, version, funding } = require("../package.json");
const required = ["client", "prefix", "encryptToken"];
const moment = require("moment");

let showed = false;

module.exports = class Tickets {
    /**
     * @param {import("@elara-services/tickets").TicketOptions} options
     */
    constructor(options) {
        if (!is.object(options)) {
            throw new Error(this.str("NO_CONSTRUCTOR_OPTIONS")());
        }
        for (const r of required) {
            if (!(r in options)) {
                throw new Error(this.str("NO_CONSTRUCTOR_OPTIONS")(`'${r}'`));
            }
        }
        this.options = options;
        if (!showed && options.suppressPatreon !== true) {
            log(`[${name}, ${version}]: Thanks for using the package, if you want to support the packages created: ${funding.map((c) => c.url).join(" or ")}`);
            showed = true;
        }
    }

    get prefix() {
        return `system:ticket:${this.options.prefix}`;
    }

    get webhookOptions() {
        return getWebhookInfo(this.options, this.str("TICKETS"));
    }

    get getSupportIds() {
        return {
            roles: this.options.support?.roles || [],
            users: this.options.support?.users || [],
            empty: [...(this.options.support?.roles || []), ...(this.options.support?.users || [])].length ? false : true,
        };
    }

    /**
     * @param {import("discord.js").Interaction} interation
     * @param {Tickets[]} tickets
     */
    runMany(interation, tickets = []) {
        if (!interation || !is.array(tickets)) {
            return this;
        }
        for (const ticket of tickets) {
            ticket.run(interation);
        }
        return this;
    }

    get manage() {
        return {
            add: async (channelId, userId, permType = "member") => {
                const channel = this.options.client.channels.resolve(channelId);
                if (!channel) {
                    return status.error(`Unable to find (${channelId}) channel`);
                }
                let mod = permType === "mod";
                let perms = {};
                if (isV13()) {
                    perms = {
                        VIEW_CHANNEL: true,
                        SEND_MESSAGES: true,
                        READ_MESSAGE_HISTORY: true,
                        ATTACH_FILES: true,
                        EMBED_LINKS: true,
                        USE_EXTERNAL_EMOJIS: true,
                    };
                    if (mod) {
                        perms["MANAGE_MESSAGES"] = true;
                        perms["MANAGE_THREADS"] = true;
                    }
                } else {
                    perms = {
                        ViewChannel: true,
                        SendMessages: true,
                        ReadMessageHistory: true,
                        AttachFiles: true,
                        EmbedLinks: true,
                        UseExternalEmojis: true,
                    };
                    if (mod) {
                        perms["ManageMessages"] = true;
                        perms["ManageThreads"] = true;
                    }
                }
                return channel.permissionOverwrites
                    .edit(userId, perms, {
                        reason: `Added to the ticket.`,
                    })
                    .then(() => status.success(`Added to the ticket.`))
                    .catch((e) => status.error(e.message || e));
            },
            remove: async (channelId, userId) => {
                const channel = this.options.client.channels.resolve(channelId);
                if (!channel) {
                    return status.error(`Unable to find (${channelId}) channel`);
                }
                return channel.permissionOverwrites
                    .delete(userId, `Removed from the ticket.`)
                    .then(() => status.success(`Removed from the ticket.`))
                    .catch((e) => status.error(e.message || e));
            },
        };
    }

    /**
     * @param {keyof typeof import("../languages/en-US")} name
     */
    str(name, lang = "en-US") {
        return getString(name, lang || this?.options?.lang || "en-US");
    }

    /** @private */
    _debug(...args) {
        if (!is.object(this.options)) {
            return null;
        }
        if (this.options?.debug) {
            console.log(...args);
        }
        return null;
    }

    button(
        options = {
            style: 3,
            label: this.str("CREATE_TICKET"),
            emoji: { name: "📩" },
        },
    ) {
        return button({
            id: options?.id || this.prefix,
            style: options.style || 3,
            title: options.label,
            emoji: options.emoji,
        });
    }

    /**
     *
     * @param {import("discord.js").ButtonInteraction} int
     */
    async handleTicketButton(int) {
        await int.deferUpdate().catch(() => null);
        const msg = await int.message.fetch(true).catch(() => null);
        const file = msg?.attachments.find((c) => c.name.endsWith(".txt"));
        if (!file) {
            return int.followUp({
                ...embedComment(`Unable to find the .txt file.`),
                ephemeral: true,
            }).catch(() => null);
        }
        const components = int.message.components.slice(0, 1);
        components.push({
            type: 1,
            components: [
                button({
                    title: `${this.str("TRANSCRIPT_VIEW")} (${moment().format("MM DD YYYY h:m:s")})`,
                    emoji: { id: "1059556038761787433" },
                    url: `https://view.elara.workers.dev/tickets?url=${file.url}`,
                }),
            ],
        });
        return int.editReply({ components }).catch(console.log);
    }
    /**
     * @param {object} opts
     * @param {import("discord.js").GuildMember} opts.member
     * @param {import("discord.js").TextChannel} opts.channel
     * @param {import("discord.js").Guild} opts.guild
     * @param {import("discord.js").User} opts.user
     * @param {string} opts.reason
     */
    async closeTicket({ member, messages, channel, guild, user, reason } = {}) {
        const { id, token, username, avatar: avatarURL, threadId } = await this.webhookOptions;
        if (!id || !token) {
            return;
        }
        let embeds = [
            {
                author: {
                    name: guild.name,
                    icon_url: guild.iconURL({ dynamic: true }),
                },
                title: this.str("CLOSE_TICKET_TITLE"),
                description: `${de.user} ${this.str("USER")}: ${user.toString()} \`@${user.tag}\` (${user.id})\n${de.user} ${this.str("CLOSED_BY")} ${member.toString()} (${member.id})\n${de.channel} ${this.str("CHANNEL")}: \`#${channel.name}\` (${channel.id})`,
                color: 0xff0000,
                fields: reason
                    ? [
                          {
                              name: this.str("CLOSE_TICKET_FIELD_REASON"),
                              value: reason?.slice?.(0, 1024) ?? this.str("NO_REASON"),
                          },
                      ]
                    : undefined,
                timestamp: new Date(),
                footer: {
                    text: `${this.str("TICKET_ID")} ${channel.name.split("-")[1]}`,
                },
            },
        ];
        new WebhookClient({ id, token })
            .send({
                username,
                avatarURL,
                embeds,
                threadId,
                files: [
                    {
                        name: `${this.str("TRANSCRIPT")}.txt`,
                        attachment: Buffer.from(displayMessages(channel, messages.reverse(), channel.name.split("-")[1], this.options.prefix, (name) => this.str(name, this?.options?.lang))),
                    },
                    {
                        name: `${this.str("TRANSCRIPT")}.html`,
                        attachment: Buffer.from(generateHTMLPage(channel, messages.reverse(), channel.name.split("-")[1], this.options.prefix, (name) => this.str(name, this?.options?.lang))),
                    },
                ],
                components: [
                    {
                        type: 1,
                        components: [
                            button({
                                id: `transcript`,
                                label: this.str("TRANSCRIPT"),
                                emoji: { id: `792290922749624320` },
                                style: ButtonStyle.SECONDARY,
                            }),
                        ],
                    },
                ],
            })
            .then(() => {
                if (user) {
                    user.send({
                        embeds: [
                            {
                                author: {
                                    name: guild.name,
                                    icon_url: guild.iconURL({ dynamic: true }),
                                },
                                title: this.str("CLOSE_TICKET_TITLE"),
                                color: 0xff0000,
                                fields: reason
                                    ? [
                                          {
                                              name: this.str("CLOSE_TICKET_FIELD_REASON"),
                                              value: reason?.slice?.(0, 1024) ?? this.str("NO_REASON"),
                                          },
                                      ]
                                    : undefined,
                                timestamp: new Date(),
                                footer: {
                                    text: `${this.str("TICKET_ID")} ${channel.name.split("-")[1]}`,
                                },
                            },
                        ],
                        files: [
                            {
                                name: `${this.str("TRANSCRIPT")}.html`,
                                attachment: Buffer.from(generateHTMLPage(channel, messages.reverse(), channel.name.split("-")[1], this.options.prefix, (name) => this.str(name, this?.options?.lang))),
                            },
                        ],
                    }).catch((e) => this._debug(e));
                }
            })
            .catch((e) => this._debug(e));
    }

    /**
     * @param {string} channelId
     * @param {import("discord.js").MessageOptions} options
     */
    async starterMessage(channelId, options) {
        let channel = this.options.client.channels.resolve(channelId);
        if (!channel) {
            return Promise.reject(this.str("NO_CHANNEL_FOUND")(channelId));
        }
        return channel
            .send({
                content: options?.content,
                files: options?.attachments,
                embeds: options?.embeds,
                components: options?.components || [{ type: 1, components: [this.button()] }],
            })
            .then(() => console.log(`✅`));
    }
};
