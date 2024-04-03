const {
        MessageEmbed,
        Constants: { MessageComponentTypes },
        MessageComponentInteraction,
    } = require("discord.js"),
    base = require("./base"),
    { de, code, fetchMessages, hasTicket, embed, webhook, getAppealServer, perms, defs } = require("./util"),
    { generate, parser, discord, is } = require("@elara-services/utils"),
    {
        Interactions: { button },
    } = require("@elara-services/packages");

module.exports = class Tickets extends base {
    /**
     * @param {import("@elara-services/tickets").TicketOptions} options
     */
    constructor(options = {}) {
        super(options);
        this.options = options;
    }
    /**
     * @param {import("discord.js").Interaction} int
     */
    async run(int) {
        if (!int || !int.guild) {
            return;
        }
        if (int.isSelectMenu()) {
            if (int.values[0] === this.prefix) {
                int.customId = this.prefix;
                int.componentType = MessageComponentInteraction.resolveType(MessageComponentTypes.BUTTON);
            }
        }
        if (int.isButton() || int.isModalSubmit()) {
            if (int.customId.startsWith("transcript")) {
                return this.handleTicketButton(int);
            }
            let { guild, channel, member, customId } = int,
                category = guild?.channels?.resolve?.(this.options.ticket?.category || channel?.parentId);
            if (!guild?.available || !channel || !member || !category) {
                return;
            }

            /**
             * @param {import("discord.js").InteractionDeferReplyOptions|import("discord.js").InteractionReplyOptions} options
             * @param {boolean} edit
             * @param {boolean} defer
             */
            const send = async (options = {}, defer = false) => {
                if (defer) {
                    return int.deferReply(options).catch((e) => this._debug(e));
                }
                if (int.replied || int.deferred) {
                    return int.editReply(options).catch((e) => this._debug(e));
                }
                return int.reply(options).catch((e) => this._debug(e));
            };
            switch (customId) {
                case this.prefix: {
                    if (
                        this.options?.ticket?.limitOnePerUser &&
                        hasTicket({
                            userId: member.id,
                            guild,
                            token: this.options.encryptToken,
                            prefix: this.options.prefix,
                        })
                    ) {
                        return send({
                            embeds: [embed(this.str("TICKET_LIMIT_ONE_PER_USER")(this.options.prefix), { guild, str: (name) => this.str(name, this?.options?.lang) })],
                            ephemeral: true,
                        });
                    }
                    if (this.options.support?.ignore?.length) {
                        if (this.options.support.ignore.some((c) => member.roles.cache.has(c))) {
                            return send({
                                embeds: [embed(this.str("TICKET_BLOCKED"), { str: (name) => this.str(name, this?.options?.lang) })],
                                ephemeral: true,
                            });
                        }
                    }
                    if (this.options.modal?.enabled) {
                        return int
                            .showModal(
                                defs.modals.custom(
                                    {
                                        title: this.options.modal?.title,
                                        components: defs.getModalComponents(this.options.modal?.questions || []),
                                    },
                                    { prefix: this.prefix, str: (name) => this.str(name, this?.options?.lang) },
                                ),
                            )
                            .catch((e) => this._debug(e));
                    }
                    return this.handleCreate({ guild, member, category, send });
                }

                case `${this.prefix}:close`: {
                    if (this.options.support?.canOnlyCloseTickets && !member.permissions.has(perms.manage.guild)) {
                        if (!this.getSupportIds.users?.includes?.(member.id)) {
                            if (!this.getSupportIds.roles?.some?.((c) => member.roles.cache.has(c))) {
                                return send({
                                    ephemeral: true,
                                    embeds: [
                                        {
                                            author: {
                                                name: this.str("ONLY_SUPPORT"),
                                                iconURL: "https://cdn.discordapp.com/emojis/781955502035697745.gif",
                                            },
                                            color: 0xff0000,
                                        },
                                    ],
                                });
                            }
                        }
                    }
                    const hasEmbeds = this.options.ticket?.close?.confirm?.embeds || [];
                    let embs = await Promise.all(
                        (hasEmbeds?.length
                            ? hasEmbeds
                            : [
                                  embed(undefined, {
                                      description: this.str("TICKET_CLOSE_CONFIRM"),
                                      title: `INFO`,
                                      color: 0xff000,
                                      guild,
                                      str: (name) => this.str(name, this?.options?.lang),
                                  }),
                              ]
                        ).map((c) => parser(c, { guild, member, user: member.user })),
                    );
                    const content = this.options.ticket?.close?.confirm?.content || undefined;
                    if (!is.array(embs) && !is.string(content)) {
                        embs = [
                            await parser(
                                embed(undefined, {
                                    description: this.str("TICKET_CLOSE_CONFIRM"),
                                    title: `INFO`,
                                    color: 0xff000,
                                    guild,
                                    str: (name) => this.str(name, this?.options?.lang),
                                }),
                                {
                                    guild,
                                    member,
                                    user: member.user,
                                },
                            ),
                        ];
                    }
                    return send({
                        ephemeral: true,
                        content,
                        embeds: embs,
                        components: [
                            {
                                type: 1,
                                components: [
                                    button({
                                        title: this.str("TICKET_CLOSE_CONFIRM_BUTTON"),
                                        style: 3,
                                        emoji: { id: "807031399563264030" },
                                        id: `${this.prefix}:close:confirm:${code(channel.topic?.split?.("ID: ")?.[1], "d", this.options.encryptToken)}${this.options?.ticket?.closeReason ? `:modal_submit` : ""}`,
                                    }),
                                ],
                            },
                        ],
                    });
                }

                case `${this.prefix}:modal_submit`: {
                    let [embed, fields, split] = [
                        new MessageEmbed()
                            .setColor("ORANGE")
                            .setTimestamp()
                            .setTitle(this.str("FORM_RESPONSES"))
                            .setFooter({ text: this.str("ID")(member.id) })
                            .setAuthor({
                                name: member.user.username,
                                iconURL: member.user.displayAvatarURL({ dynamic: true }),
                            }),
                        [],
                        false,
                    ];
                    for (const c of int.fields.components) {
                        for (const cc of c.components) {
                            if (cc.value && cc.customId) {
                                fields.push({ name: cc.customId, value: cc.value });
                                if (cc.value.length <= 1024) {
                                    embed.addFields({ name: cc.customId, value: cc.value });
                                } else {
                                    split = true;
                                }
                            }
                        }
                    }
                    if (embed.length >= 6000 || split) {
                        return this.handleCreate({
                            guild,
                            member,
                            category,
                            send,
                            embeds: fields.map((v, i) => ({
                                title: `${this.str("FORM_RESPONSE")}: ${v.name}`,
                                color: embed.color,
                                description: v.value,
                                author:
                                    i === 0
                                        ? {
                                              name: member.user.username,
                                              iconURL: member.user.displayAvatarURL({
                                                  dynamic: true,
                                              }),
                                          }
                                        : undefined,
                                timestamp: fields.length - 1 === i ? new Date() : undefined,
                                footer: fields.length - 1 === i ? { text: this.str("ID")(member.id) } : undefined,
                            })),
                        });
                    }
                    return this.handleCreate({
                        guild,
                        member,
                        category,
                        send,
                        embeds: [embed],
                    });
                }
            }
            if (customId.startsWith(`${this.prefix}:close:confirm`)) {
                if (customId.includes(`:modal_submit`)) {
                    return int.showModal(defs.modals.reason(customId, (name) => this.str(name, this?.options?.lang)));
                }
                await send({ ephemeral: true }, true);
                let reason = this.str("NO_REASON");
                if (int.isModalSubmit()) {
                    reason = int.fields.getTextInputValue("reason");
                }
                const user = await discord.user(this.options.client, customId.split("close:confirm:")[1].replace(/:modal_complete/gi, ""), { fetch: true, mock: false });
                if (!user) {
                    return send({
                        embeds: [embed(this.str("NO_USER_FOUND", { str: (name) => this.str(name, this?.options?.lang) }))],
                    });
                }
                let messages = await fetchMessages(channel, 5000);
                if (!messages?.length) {
                    return send({
                        embeds: [embed(this.str("NO_MESSAGES_FETCHED"), { str: (name) => this.str(name, this?.options?.lang) })],
                    });
                }
                let closed = await channel.delete(`${member.user.tag} (${member.id}) ${this.str("CLOSED_TICKET")}`).catch((e) => this._debug(e));
                if (!closed) {
                    return send({
                        embeds: [embed(this.str("NO_CHANNEL_DELETE"), { str: (name) => this.str(name, this?.options?.lang) })],
                    });
                }
                return this.closeTicket({
                    channel,
                    guild,
                    user,
                    member,
                    messages,
                    reason,
                });
            }

            if (customId.startsWith(`${this.prefix}:unban:`)) {
                if (!int.memberPermissions?.has?.([perms.members.ban])) {
                    return send({
                        embeds: [embed(this.str("NO_BAN_PERMS_USER"), { str: (name) => this.str(name, this?.options?.lang) })],
                        ephemeral: true,
                    });
                }
                let server = getAppealServer(this.options);
                if (!server) {
                    return send({
                        embeds: [embed(this.str("NO_APPEAL_SERVER_FOUND"), { str: (name) => this.str(name, this?.options?.lang) })],
                        ephemeral: true,
                    });
                }
                const mod = await discord.member(server, member.id, true);
                if (!mod) {
                    return send({
                        embeds: [embed(this.str("NOT_FOUND_IN_APPEAL_SERVER")(server), { str: (name) => this.str(name, this?.options?.lang) })],
                        ephemeral: true,
                    });
                }
                if (!mod.permissions?.has?.([perms.members.ban])) {
                    return send({
                        embeds: [embed(this.str("NO_BAN_PERMS_USER_IN_APPEAL_SERVER")(server), { str: (name) => this.str(name, this?.options?.lang) })],
                        ephemeral: true,
                    });
                }
                return int.showModal(defs.modals.unbanReason(customId, server, (name) => this.str(name, this?.options?.lang), member, this.prefix)).catch((e) => this._debug(e));
            }

            if (customId.startsWith(`${this.prefix}:unban_modal:`)) {
                await send({ ephemeral: true }, true);
                const [, , id] = customId.split(":");
                if (!int.memberPermissions?.has?.([perms.members.ban])) {
                    return send({
                        embeds: [embed(this.str("NO_BAN_PERMS_USER"), { str: (name) => this.str(name, this?.options?.lang) })],
                    });
                }
                let server = getAppealServer(this.options);
                if (!server) {
                    return send({
                        embeds: [embed(this.str("NO_APPEAL_SERVER_FOUND"), { str: (name) => this.str(name, this?.options?.lang) })],
                    });
                }
                const mod = await discord.member(server, member.id, true);
                if (!mod) {
                    return send({
                        embeds: [embed(this.str("NOT_FOUND_IN_APPEAL_SERVER")(server), { str: (name) => this.str(name, this?.options?.lang) })],
                    });
                }
                if (!mod.permissions?.has?.([perms.members.ban])) {
                    return send({
                        embeds: [embed(this.str("NO_BAN_PERMS_USER_IN_APPEAL_SERVER")(server), { str: (name) => this.str(name, this?.options?.lang) })],
                    });
                }
                let isBanned = await server.bans.fetch({ user: id, force: true }).catch((e) => this._debug(e));
                if (!isBanned) {
                    return send({
                        embeds: [embed(this.str("USER_NOT_BANNED")(id), { str: (name) => this.str(name, this?.options?.lang) })],
                    });
                }
                return server.bans
                    .remove(id, int.fields.getTextInputValue("reason") ?? `${this.str("NO_REASON")} | ${this.str("BY")}: ${member.user.tag} (${member.id})`)
                    .then(() => {
                        int.message
                            .edit({
                                components: [
                                    {
                                        type: 1,
                                        components: [
                                            button({
                                                title: this.str("UNBANNED"),
                                                style: 3,
                                                id: "_ _",
                                                disabled: true,
                                                emoji: { id: `476629550797684736` },
                                            }),
                                        ],
                                    },
                                ],
                            })
                            .catch((e) => this._debug(e));
                        send({
                            embeds: [embed(this.str("UNBAN_SUCCESS")(id, server.name), { str: (name) => this.str(name, this?.options?.lang) })],
                        });
                    })
                    .catch((e) =>
                        send({
                            embeds: [
                                {
                                    title: this.str("ERROR"),
                                    fields: [
                                        {
                                            name: "\u200b",
                                            value: this.str("UNBAN_FAILED")(id, server.name),
                                        },
                                    ],
                                    description: `\`\`\`js\n${e.message ?? e.stack}\`\`\``,
                                    color: 0xff0000,
                                },
                            ],
                        }),
                    );
            }
        }
    }

    /** @private */
    async handleCreate({ guild, member, category, send, embeds = [] } = {}) {
        await send({ ephemeral: true }, true);
        let [permissions, { appeals }, sendBanReason] = [[], this.options ?? {}, null];
        if (this.getSupportIds.roles.length) {
            for (const sup of this.getSupportIds.roles) {
                let role = guild.roles.resolve(sup);
                if (role) {
                    permissions.push({
                        type: "role",
                        id: sup,
                        allow: perms.allows.support,
                    });
                }
            }
        }

        if (this.getSupportIds.users.length) {
            for await (const uId of this.getSupportIds.users) {
                const member = await discord.member(guild, uId, true);
                if (member) {
                    permissions.push({
                        type: "member",
                        id: uId,
                        allow: perms.allows.support,
                    });
                }
            }
        }
        if (appeals?.enabled) {
            let server = getAppealServer(this.options);
            if (server) {
                let ban = await server.bans.fetch({ user: member.id, force: true }).catch((e) => this._debug(e));
                if (!ban) {
                    return send(
                        typeof appeals.embeds?.not_banned === "object"
                            ? await parser(appeals.embeds.not_banned, { guild: server, member, user: member.user })
                            : {
                                  embeds: [
                                      embed(this.str("NOT_BANNED_MAIN_SERVER"), {
                                          guild,
                                          color: 0xff0000,
                                          str: (name) => this.str(name, this?.options?.lang),
                                      }),
                                  ],
                              },
                    );
                }
                sendBanReason = {
                    embeds: [
                        embed(ban?.reason ?? this.str("NO_REASON"), {
                            title: this.str("BAN_REASON"),
                            guild: server,
                            str: (name) => this.str(name, this?.options?.lang),
                        }),
                    ],
                    components: [
                        {
                            type: 1,
                            components: [
                                button({
                                    id: `${this.prefix}:unban:${member.id}`,
                                    style: 4,
                                    title: this.str("UNBAN"),
                                    emoji: { name: "🔒" },
                                }),
                            ],
                        },
                    ],
                };
            }
        }
        let channel = await guild.channels
            .create(`${this.options.prefix}-${generate(5)}`, {
                type: "GUILD_TEXT",
                parent: category,
                reason: `${this.str("OPEN_TICKET_AUDIT_REASON")} @${member.user.tag} (${member.id})`,
                topic: `ID: ${code(member.id, "e", this.options.encryptToken)}`,
                permissionOverwrites: [
                    {
                        type: "member",
                        id: this.options.client.user.id,
                        allow: perms.allows.client,
                    },
                    {
                        type: "member",
                        id: member.id,
                        allow: perms.allows.ticketUser,
                        deny: perms.denied.ticketUser,
                    },
                    { type: "role", id: guild.id, deny: perms.denied.all },
                    ...permissions,
                ],
            })
            .catch((e) => this._debug(e));
        if (!channel) {
            return send({ embeds: [embed(this.str("NO_CHANNEL_CREATE"), { str: (name) => this.str(name, this?.options?.lang) })] });
        }
        let embs = await Promise.all(
            (
                this.options.ticket?.open?.embeds || [
                    embed(undefined, {
                        title: this.str("OPEN_TICKET_MESSAGE"),
                        color: 0xf50de3,
                        guild,
                        footer: { text: this.str("OPEN_TICKET_MESSAGE_FOOTER") },
                        str: (name) => this.str(name, this?.options?.lang),
                    }),
                ]
            ).map((c) => parser(c, { guild, member, user: member.user })),
        );
        const content = this.options.ticket?.open?.content || `${member.user.toString()} ${this.str("OPEN_TICKET_MESSAGE_CONTENT")}`;
        let msg = await channel
            .send({
                content: await parser(content, { guild, member, user: member.user }),
                embeds: embs,
                components: [
                    {
                        type: 1,
                        components: [
                            button({
                                id: `${this.prefix}:close`,
                                title: this.str("CLOSE_TICKET"),
                                style: 4,
                                emoji: { name: "🔒" },
                            }),
                        ],
                    },
                ],
                allowedMentions: {
                    users: [member.id, ...this.getSupportIds.users],
                    roles: [...this.getSupportIds.roles],
                },
            })
            .catch((e) => this._debug(e));
        if (!msg) {
            return null;
        }
        if (sendBanReason) {
            await channel.send(sendBanReason).catch((e) => this._debug(e));
        }
        if (embeds?.length <= 10) {
            for await (const embed of embeds) {
                await channel.send({ embeds: [embed] }).catch((e) => this._debug(e));
            }
        }
        if (this.options.ticket?.supportCommentThread === true) {
            const thread = await channel.threads
                .create({
                    name: this.str("SUPPORT_TALK"),
                    invitable: false,
                    type: 12,
                })
                .catch((e) => this._debug(e));
            if (thread && !this.getSupportIds.empty) {
                await thread
                    .send({
                        content: `${this.getSupportIds.roles.length ? this.getSupportIds.roles.map((c) => `<@&${c}>`).join(" ") : ""}${this.getSupportIds.users.length ? `${this.getSupportIds.roles.length ? ` | ` : ""}${this.getSupportIds.users.map((c) => `<@${c}>`).join(" ")}` : ""}`,
                    })
                    .catch((e) => this._debug(e));
            }
        }
        const webOpt = await this.webhookOptions;
        if (webOpt.id && webOpt.token) {
            webhook(webOpt)
                .embed(
                    embed(`${de.user} ${this.str("USER")}: ${member.user.toString()} \`@${member.user.tag}\` (${member.id})\n${de.channel} ${this.str("CHANNEL")}: \`#${channel.name}\` (${channel.id})`, {
                        title: this.str("OPEN_TICKET_TITLE"),
                        color: 0xff000,
                        footer: {
                            text: `${this.str("TICKET_ID")} ${channel.name.split("-")[1]}`,
                        },
                        guild,
                        str: (name) => this.str(name, this?.options?.lang),
                    }),
                )
                .send()
                .catch((e) => this._debug(e));
        }
        return send({
            embeds: [
                embed(channel.toString(), {
                    color: 0xff000,
                    author: {
                        name: this.str("OPEN_TICKET_CREATE"),
                        icon_url: `https://cdn.discordapp.com/emojis/476629550797684736.gif`,
                    },
                    str: (name) => this.str(name, this?.options?.lang),
                }),
            ],
            components: [
                {
                    type: 1,
                    components: [button({ title: this.str("GO_TO_TICKET"), url: msg.url })],
                },
            ],
        });
    }
};
