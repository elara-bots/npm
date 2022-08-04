const { EmbedBuilder: MessageEmbed, InteractionType, PermissionFlagsBits, ChannelType } = require("discord.js"),
        base = require("./base"),
      { de, code, fetchMessages, hasTicket, embed, webhook, getAppealServer } = require("./util"),
      { generate } = require("shortid"),
      { Interactions: { button, modal } } = require("@elara-services/packages");

module.exports = class Tickets extends base {
    constructor(options = {}) {
        super(options);
    };
    /**
     * @param {import("discord.js").Interaction} int 
     */
    async run(int) {
        if (!int) return;
        if (int.isButton() || int.type === InteractionType.ModalSubmit) {
            let { guild, channel, member, customId } = int,
                category = guild?.channels?.resolve?.(this.options.ticket?.category || this.options.ticketCategory || channel?.parentId);
            if (!guild?.available || !channel || !member || !category) return;

            /**
             * @param {import("discord.js").InteractionDeferReplyOptions|import("discord.js").InteractionReplyOptions} options 
             * @param {boolean} edit 
             * @param {boolean} defer 
             */
            const send = async (options = {}, defer = false) => {
                if (defer) return int.deferReply(options).catch(e => this._debug(e));
                if (int.replied || int.deferred) return int.editReply(options).catch(e => this._debug(e));
                return int.reply(options).catch(e => this._debug(e));
            };
            switch (customId) {
                case this.prefix: {
                    if (this.options?.ticket?.limitOnePerUser && hasTicket({ userId: member.id, guild, token: this.options.encryptToken, prefix: this.options.prefix })) return send({ embeds: [ embed(`❌ You can only create one (${this.options.prefix}) ticket at a time.`, { guild }) ], ephemeral: true })
                    if (this.options.support?.ignore?.length) {
                        if (this.options.support.ignore.some(c => member.roles?.cache?.has?.(c))) return send({ embeds: [embed(`❌ You can no longer create tickets, if you believe this is a mistake contact one of the staff members.`)], ephemeral: true });
                    }
                    if (this.options.modal?.enabled) return int.showModal(this.modal({ title: this.options.modal.title, components: this.options.modal.questions?.length >= 1 ? this.options.modal.questions.slice(0, 5).map(c => ({ type: 1, components: [{ min_length: c.min_length || 10, max_length: c.max_length || 4000, type: 4, style: c.style || 2, label: c.label, value: c.value, placeholder: c.placeholder, required: c.required, custom_id: c.label || `random_${Math.floor(Math.random() * 10000)}` }] })) : [] })).catch(e => this._debug(e));
                    return this.handleCreate({ guild, member, category, send })
                };

                case `${this.prefix}:close`: {
                    if (this.options.support?.canOnlyCloseTickets && !member.permissions.has(PermissionFlagsBits.ManageGuild)) {
                        if (!this.getSupportIds.users?.includes?.(member.id)) {
                            if (!this.getSupportIds.roles?.some?.(c => member.roles?.cache?.has?.(c))) return send({ ephemeral: true, embeds: [{ author: { name: `Only support staff can close tickets`, iconURL: "https://cdn.discordapp.com/emojis/781955502035697745.gif" }, color: 0xFF0000 }] })
                        }
                    }
                    return send({ 
                        ephemeral: true, 
                        embeds: [ embed(`🤔 Are you sure you want to close the ticket?`, { color: 0xFF000, guild }) ], 
                        components: [
                            { type: 1, components: [
                                button({ title: "Yes, close the ticket!", style: 3, emoji: { id: "807031399563264030" }, id: `${this.prefix}:close:confirm:${code(channel.topic?.split?.("ID: ")?.[1], "d", this.options.encryptToken)}${this.options?.ticket?.closeReason ? `:modal_submit` : ""}` })
                            ] 
                        }] 
                    })
                }

                case `${this.prefix}:modal_submit`: {
                    let [embed, fields, split] = [new MessageEmbed().setColor("Orange").setTimestamp().setTitle(`For Responses`).setFooter({ text: `ID: ${member.id}` }).setAuthor({ name: member.user.username, iconURL: member.user.displayAvatarURL({ dynamic: true }) }), [], false];
                    for (const c of int.fields.components) {
                        for (const cc of c.components) {
                            if (cc.value && cc.customId) {
                                fields.push({ name: cc.customId, value: cc.value });
                                if (cc.value.length <= 1024) embed.addFields({ name: cc.customId, value: cc.value });
                                else split = true
                            }
                        }
                    }
                    if (embed.length >= 6000 || split) {
                        return this.handleCreate({
                            guild, member, category, send, embeds: fields.map((v, i) => ({
                                title: `Form Response: ${v.name}`, color: embed.color, description: v.value,
                                author: i === 0 ? { name: member.user.username, iconURL: member.user.displayAvatarURL({ dynamic: true }) } : undefined,
                                timestamp: fields.length - 1 === i ? new Date() : undefined,
                                footer: fields.length - 1 === i ? { text: `ID: ${member.id}` } : undefined
                            }))
                        })
                    };
                    return this.handleCreate({ guild, member, category, send, embeds: [embed] })
                }
            };
            if (customId.startsWith(`${this.prefix}:close:confirm`)) {
                if (customId.includes(`:modal_submit`)) {
                    return int.showModal(modal({
                        id: `${customId.split(":modal_submit")[0]}:modal_complete`,
                        title: "Reason",
                        components: [ { type: 1, components: [ { type: 4, custom_id: "reason", label: "Reason", style: 2, min_length: 1, max_length: 1024, required: true, placeholder: "What's the reason for closing the ticket?" } ] } ]
                    }))
                }
                await send({ ephemeral: true }, true);
                let reason = "No Reason Provided";
                if (int.type === InteractionType.ModalSubmit) reason = int.fields.getTextInputValue("reason")
                let user = await this.options.client.users.fetch(customId.split("close:confirm:")[1].replace(/:modal_complete/gi, "")).catch(e => this._debug(e));
                if (!user) return send({ embeds: [ embed(`❌ I was unable to fetch the user that opened the ticket.`) ] });
                let messages = await fetchMessages(channel, 5000);
                if (!messages?.length) return send({ embeds: [ embed(`❌ I was unable to close the ticket, I couldn't fetch the messages in this channel.`) ] });
                let closed = await channel.delete(`${member.user.tag} (${member.id}) closed the ticket.`).catch(e => this._debug(e));
                if (!closed) return send({ embeds: [ embed(`❌ I was unable to delete the channel and close the ticket.`) ] });
                return this.closeTicket({ channel, guild, user, member, messages, reason });
            };

            if (customId.startsWith("unban:")) {
                if (!int.memberPermissions?.has?.(PermissionFlagsBits.BanMembers)) return send({ embeds: [ embed(`❌ You need (Ban Members) in this server to complete this action!`) ], ephemeral: true });
                let server = getAppealServer(this.options);
                if (!server) return send({ embeds: [embed(`❌ I was unable to find the appeal server!`)], ephemeral: true });
                let mod = server.members.resolve(member.id) || await server.members.fetch(member.id).catch(e => this._debug(e));
                if (!mod) return send({ embeds: [embed(`❌ I was unable to find you in ${server.name}!`)], ephemeral: true });
                if (!mod.permissions?.has?.(PermissionFlagsBits.BanMembers)) return send({ embeds: [embed(`❌ You need (Ban Members) in ${server.name} to complete this action!`)], ephemeral: true });
                return int.showModal(modal({
                    id: `unban_modal:${customId.split(":")[1]}`,
                    title: `Unban From ${server.name}`,
                    components: [ { type: 1, components: [ { type: 4, label: "Reason", custom_id: "reason", style: 2, min_length: 1, max_length: 512, required: true, value: `No Reason Provided | By: ${member.user.tag} (${member.id})` } ] } ]
                })).catch(e => this._debug(e));
            }

            if (customId.startsWith("unban_modal:")) {
                await send({ ephemeral: true }, true);
                const [ , id ] = customId.split(":");
                if (!int.memberPermissions?.has?.(PermissionFlagsBits.BanMembers)) return send({ embeds: [ embed(`❌ You need (Ban Members) in this server to complete this action!`)] });
                let server = getAppealServer(this.options);
                if (!server) return send({ embeds: [embed(`❌ I was unable to find the appeal server!`)] });
                let mod = server.members.resolve(member.id) || await server.members.fetch(member.id).catch(e => this._debug(e));
                if (!mod) return send({ embeds: [embed(`❌ I was unable to find you in ${server.name}!`)] });
                if (!mod.permissions?.has?.(PermissionFlagsBits.BanMembers)) return send({ embeds: [embed(`❌ You need (Ban Members) in ${server.name} to complete this action!`)] });
                let isBanned = await server.bans.fetch({ user: id, force: true }).catch(e => this._debug(e));
                if (!isBanned) return send({ embeds: [embed(`❌ User (<@${id}>) isn't banned in the main server!`)] });
                return server.bans.remove(id, int.fields.getTextInputValue("reason") ?? `No Reason Provided | By: ${member.user.tag} (${member.id})`)
                .then(() => {
                    int.message.edit({ components: [ { type: 1, components: [ button({ title: "Unbanned!", style: 3, id: "_ _", disabled: true, emoji: { id: `476629550797684736` } }) ] } ] }).catch(e => this._debug(e));
                    send({ embeds: [embed(`✅ Successfully unbanned <@${id}> from ${server.name}!`)] })
                })
                .catch(e => send({ embeds: [ { title: "ERROR", fields: [ { name: "\u200b", value: `❌ Unable to unban <@${id} from ${server.name}!` } ], description: `\`\`\`js\n${e.message ?? e.stack}\`\`\``, color: 0xFF0000 } ] }))
            }
        };
    };

    /** @private */
    async handleCreate({ guild, member, category, send, embeds = [] } = {}) {
        await send({ ephemeral: true }, true);
        let [ permissions, allow, { appeals }, sendBanReason ] = [
            [],
            [
                PermissionFlagsBits.AddReactions,
                PermissionFlagsBits.AttachFiles,
                PermissionFlagsBits.CreateInstantInvite,
                PermissionFlagsBits.EmbedLinks,
                PermissionFlagsBits.ReadMessageHistory,
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.UseExternalEmojis,
                PermissionFlagsBits.SendMessages
            ],
            this.options ?? {},
            null
        ];
        if (this.getSupportIds.roles.length) for (const sup of this.getSupportIds.roles) {
            let role = guild.roles.resolve(sup);
            if (role) permissions.push({ type: "role", id: sup, allow });
        };

        if (this.getSupportIds.users.length) for (const uId of this.getSupportIds.users) {
            let member = guild.members.resolve(uId) || await guild.members.fetch(uId).catch((e) => {
                if (e?.stack?.includes?.("Unknown Member")) this.options.support.users = this.options.support.users.filter(c => c !== uId);
                return this._debug(e);
            });
            if (member) permissions.push({ type: "member", id: uId, allow });
        }
        if (appeals?.enabled) {
            let server = getAppealServer(this.options);
            if (server) {
                let ban = await server.bans.fetch({ user: member.id, force: true }).catch(e => this._debug(e));
                if (!ban) return send(
                    typeof appeals.embeds?.not_banned === "object" ?
                        appeals.embeds.not_banned :
                        { embeds: [ embed(`❌ You can't open this ticket due to you not being banned in the main server!`, { guild, color: 0xFF0000 }) ] }
                );
                sendBanReason = {
                    embeds: [ embed(ban?.reason ?? "No Reason Provided", { title: "Ban Reason", guild: server }) ],
                    components: [
                        {
                            type: 1, components: [
                                button({ id: `unban:${member.id}`, style: 4, title: "Unban", emoji: { name: "🔒" } })
                            ]
                        }
                    ]
                }
            }
        }
        let channel = await guild.channels.create({
            name: `${this.options.prefix}-${generate().slice(0, 5).replace(/-|_/g, "")}`,
            type: ChannelType.GuildText, 
            parent: category, 
            reason: `Ticket created by: @${member.user.tag} (${member.id})`,
            topic: `ID: ${code(member.id, "e", this.options.encryptToken)}`,
            permissionOverwrites: [
                { 
                    type: "member", 
                    id: this.options.client.user.id, 
                    allow: [
                        PermissionFlagsBits.AddReactions,
                        PermissionFlagsBits.AttachFiles,
                        PermissionFlagsBits.SendMessages,
                        PermissionFlagsBits.ReadMessageHistory,
                        PermissionFlagsBits.EmbedLinks,
                        PermissionFlagsBits.UseExternalEmojis,
                        PermissionFlagsBits.ViewChannel,
                        PermissionFlagsBits.MentionEveryone
                    ] 
                },
                { 
                    type: "member", 
                    id: member.id, 
                    allow: [
                        PermissionFlagsBits.AddReactions,
                        PermissionFlagsBits.AttachFiles,
                        PermissionFlagsBits.SendMessages,
                        PermissionFlagsBits.ReadMessageHistory,
                        PermissionFlagsBits.EmbedLinks,
                        PermissionFlagsBits.UseExternalEmojis,
                        PermissionFlagsBits.ViewChannel
                    ], 
                    deny: [ PermissionFlagsBits.MentionEveryone ] 
                },
                { type: "role", id: guild.id, deny: [ PermissionFlagsBits.ViewChannel ] },
                ...permissions
            ]
        }).catch(e => this._debug(e));
        if (!channel) return send({ embeds: [embed(`❌ I was unable to create the ticket channel, if this keeps happening contact one of the staff members via their DMs!`)] });
        let msg = await channel.send({
            content: (this.options.ticket?.open || this.options.ticketOpen)?.content?.replace?.(/%user%/gi, member.user.toString())?.replace?.(/%server%/gi, guild.name) || `${member.user.toString()} 👋 Hello, please explain what you need help with.`,
            embeds: (this.options.ticket?.open || this.options.ticketOpen)?.embeds || [ embed(undefined, { title: `Support will be with you shortly.`, color: 0xF50DE3, guild, footer: { text: `To close the ticket, press the button below` } }) ],
            components: [ { type: 1, components: [ button({ id: `${this.prefix}:close`, title: `Close Ticket`, style: 4, emoji: { name: "🔒" } }) ] }]
        }).catch(e => this._debug(e));
        if (!msg) return null;
        if (sendBanReason) await channel.send(sendBanReason).catch(e => this._debug(e));
        if (embeds?.length <= 10) for await (const embed of embeds) await channel.send({ embeds: [embed] }).catch(e => this._debug(e));
        if (this.webhookOptions.id && this.webhookOptions.token) webhook(this.webhookOptions)
            .embed(embed(`${de.user} User: ${member.user.toString()} \`@${member.user.tag}\` (${member.id})\n${de.channel} Channel: \`#${channel.name}\` (${channel.id})`, {
                title: `TIcket: Opened`,
                color: 0xFF000,
                footer: { text: `Ticket ID: ${channel.name.split("-")[1]}` },
                guild
            })).send().catch(e => this._debug(e));
        return send({
            embeds: [ embed(channel.toString(), { color: 0xFF000, author: { name: `Ticket Created!`, icon_url: `https://cdn.discordapp.com/emojis/476629550797684736.gif` } }) ],
            components: [{ type: 1, components: [button({ title: "Go to ticket", url: msg.url })] }]
        })
    }

    async starterMessage(channelId, options) {
        let channel = this.options.client.channels.resolve(channelId);
        if (!channel) return Promise.reject(`No channel found for: ${channelId}`);
        if (!channel.isText()) return Promise.reject(`The channel ID provided isn't a text-based-channel`);
        if (!channel.permissionsFor?.(this.options.client.user.id)?.has?.([
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.AttachFiles,
            PermissionFlagsBits.EmbedLinks,
            PermissionFlagsBits.ReadMessageHistory
        ])) return Promise.reject(`I'm missing permissions in ${channel.name} (${channelId})`);
        return channel.send({ content: options?.content, files: options?.attachments, embeds: options?.embeds, components: options?.components || [{ type: 1, components: [this.button()] }] })
            .then(() => console.log(`Sent the starter message in ${channel.name} (${channel.id})`))
    };
};