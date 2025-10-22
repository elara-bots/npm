const {
        AES,
        Interactions: { modal },
    } = require("@elara-services/packages"),
    { Collection, version } = require("discord.js"),
    { DiscordWebhook: Webhook, Webhook: BotHook } = require("@elara-services/webhooks"),
    defLang = require("../languages/en-US"),
    pack = require("../package.json");
const { discordView } = require("./html");
const { make } = require("@elara-services/utils");

exports.emojis = {
    tickets: "1374908572982448208",
    info: "847397714677334066",
    success: "476629550797684736",
    xmark: "781955502035697745",
    warning: "807031399563264030",
};

exports.getString = (name, lang = "en-US") => {
    if (!lang) {
        lang = "en-US";
    }
    let str = "[UNKNOWN STRING]";
    if (!pack.languages.includes(lang)) {
        lang = "en-US";
    }
    try {
        let file = require(`../languages/${lang}.js`);
        if (file[name]) {
            str = file[name];
        }
    } catch {
        if (defLang[name]) {
            str = defLang[name];
        }
    }
    return str;
};

exports.code = (message, type = "d", token) => {
    if (!message || !type) {
        return "";
    }
    if (!token) {
        return message;
    }
    try {
        const aes = new AES(token);
        return aes[type === "e" ? "encrypt" : "decrypt"](message);
    } catch {
        return message;
    }
};

exports.de = {
    user: "<:Members:860931214232125450>",
    channel: "<:Channel:841654412509839390>",
    transcript: "<:Log:792290922749624320>",
};

exports.perms = {
    manage: {
        guild: 32n,
    },
    members: {
        ban: 4n,
    },
    basic: 117760n,
    allows: {
        support: 379969n,
        ticketUser: 379968n,
        client: 511040n,
    },
    denied: {
        all: 1024n, // @everyone role
        ticketUser: 131072n,
    },
};

exports.fetchMessages = async (channel, limit = 50, before, after, around) => {
    if (limit && limit > 100) {
        let logs = [];
        const get = async (_before, _after) => {
            const messages = [
                ...(
                    await channel.messages
                        .fetch({
                            limit: 100,
                            before: _before || undefined,
                            after: _after || undefined,
                        })
                        .catch(() => new Collection())
                ).values(),
            ];
            if (limit <= messages.length) {
                return _after
                    ? messages
                          .slice(messages.length - limit, messages.length)
                          .map((message) => message)
                          .concat(logs)
                    : logs.concat(messages.slice(0, limit).map((message) => message));
            }
            limit -= messages.length;
            logs = _after ? messages.map((message) => message).concat(logs) : logs.concat(messages.map((message) => message));
            if (messages.length < 100) {
                return logs;
            }
            return get((_before || !_after) && messages[messages.length - 1].id, _after && messages[0].id);
        };
        return get(before, after);
    }
    return [...(await channel.messages.fetch({ limit, before, after, around }).catch(() => new Collection())).values()];
};

exports.displayMessages = (channel, messages = [], ticketID, type, str) => {
    let users = [];
    for (const i of messages.values()) {
        let f = users.find((c) => c.user.id === i.author.id);
        if (f) {
            f.count++;
        } else {
            users.push({ user: i.author, count: 1 });
        }
    }
    return [
        `<discord-messages>`,
        `<discord-message author="${type} ${str("TICKET")}: ${ticketID}" bot="true" verified avatar="${make.emojiURL(exports.emojis.info)}" role-color="#1da1f2">${str("TOTAL_MESSAGES")}: ${users
            .map((c) => c.count)
            .reduce((a, b) => a + b, 0)
            .toLocaleString()}<br>${users.map((c) => `<discord-mention type="role" color="${channel.guild?.members?.resolve?.(c.user.id)?.displayColor ? channel.guild?.members?.resolve?.(c.user.id)?.displayHexColor : `#ffffff`}">${c.user.tag}</discord-mention> (${c.user.id})`).join("<br>")}</discord-message></discord-messages><discord-messages>`,
        ...messages.map((message) => {
            let str = [
                `<discord-message${message.author.bot ? ` bot="true" ${message.author.flags?.has?.(version?.includes?.("14") ? 1 << 16 : "VERIFIED_BOT") ? `verified="true"` : ""}` : ""} new_timestamp="${message.createdAt.toISOString()}" author="${message.author.username}" avatar=${message.author.displayAvatarURL({
                    dynamic: true,
                    format: "png",
                })} role-color="${channel.guild?.members?.resolve?.(message.author.id)?.displayColor ? channel.guild?.members?.resolve?.(message.author.id)?.displayHexColor : `#ffffff`}">`,
            ];
            if (message.content) {
                let content = message.content;
                if (message.mentions.users.size) {
                    for (const user of message.mentions.users.values()) {
                        content = content.replace(new RegExp(`<@!?${user.id}>`, "g"), `<discord-mention type="role" color="${message.guild?.members?.resolve?.(user?.id)?.displayHexColor ?? "#ffffff"}">${user.tag}</discord-mention>`);
                    }
                }
                if (message.mentions.channels.size) {
                    for (const channel of message.mentions.channels.values()) {
                        content = content.replace(new RegExp(channel.toString(), "g"), `<discord-mention type="channel">${channel.name}</discord-mention>`);
                    }
                }
                if (message.mentions.roles.size) {
                    for (const role of message.mentions.roles.values()) {
                        content = content.replace(new RegExp(role.toString(), "g"), `<discord-mention type="role" color="${role.hexColor}">${role.name}</discord-mention>`);
                    }
                }
                str.push(content);
            }
            if (message.embeds?.length) {
                let arr = [`<discord-embeds slot="embeds">`];
                for (const embed of message.embeds) {
                    let emb = [
                        `<discord-embed slot="embed" ${embed.thumbnail?.url ? `thumbnail="${embed.thumbnail.url}"` : ""} ${embed.image?.url ? `image="${embed.image.url}"` : ""} ${embed.author ? `${embed.author.name ? `author-name="${embed.author.name}"` : ""} ${embed.author.iconURL ? `author-image="${embed.author.iconURL}"` : ""} ${embed.author.url ? `author-url="${embed.author.url}"` : ""}` : ""} ${embed.title ? `embed-title="${embed.title}"` : ""}${
                            embed.color ? `color="${embed.hexColor}"` : ""
                        }>`,
                    ];
                    if (embed.description) {
                        emb.push(`<discord-embed-description slot="description">${embed.description}</discord-embed-description>`);
                    }
                    if (embed.fields?.length) {
                        emb.push(`<discord-embed-fields slot="fields">`);
                        for (const field of embed.fields) {
                            emb.push(`<discord-embed-field field-title="${field.name}" ${field.inline ? `inline` : ""}>${field.value}</discord-embed-field>`);
                        }
                    }
                    arr.push(...emb, `</discord-embed>`);
                }
                str.push(...arr, "</discord-embeds>");
            }
            if (message.interaction?.user) {
                str.push(
                    `<discord-command slot="reply" command="${message.interaction.type === "APPLICATION_COMMAND" ? "/" : ""}${message.interaction.commandName}" profile="${message.interaction.user.id}" role-color="${channel.guild?.members?.resolve?.(message.interaction.user?.id)?.displayHexColor || "#fffff"}" author="${message.interaction.user.tag}" avatar="${message.interaction.user.displayAvatarURL({
                        dynamic: true,
                    })}"></discord-command>`,
                );
            }
            if (message.components?.length) {
                let row = [`<discord-attachments slot="components">`],
                    styles = {
                        PRIMARY: "primary",
                        SECONDARY: "secondary",
                        SUCCESS: "success",
                        DANGER: "destructive",
                        LINK: "secondary",
                    };
                for (const components of message.components) {
                    row.push(`<discord-action-row>`);
                    for (const c of components.components) {
                        if (c.type === "BUTTON") {
                            row.push(`<discord-button ${c.disabled ? `disabled=true` : ""} type="${styles[c.style]}" ${c.emoji?.name ? `emoji-name="${c.emoji.name}"` : ""} ${c.emoji?.id ? `emoji="https://cdn.discordapp.com/emojis/${c.emoji.id}.${c.emoji.animated ? "gif" : "png"}"` : ""} ${c.url ? `url="${c.url}"` : ""}>${c.label || ""}</discord-button>`);
                        }
                    }
                    row.push(`</discord-action-row>`);
                }
                if (row.length >= 2) {
                    str.push(...row, `</discord-attachments>`);
                }
            }
            if (message.attachments.size) {
                str.push(message.attachments.map((c) => `<a href="${c.proxyURL}">${c.name}</a>`).join("<br>"));
            }
            str.push(`${message.content?.length ? `<br><br>` : ""}<code style="background-color: #36393e; color: white;">ID: ${message.id}</code>`);
            return [...str, `</discord-message>`].join(" ");
        }),
        "</discord-messages>",
    ].join(" ");
};

/**
 * @description Generates an HTML page string to use.
 */
exports.generateHTMLPage = (channel, messages = [], ticketID, type, str) => {
    return discordView(exports.displayMessages(channel, messages, ticketID, type, str));
};

exports.defs = {
    modals: {
        reason: (customId, str) =>
            modal({
                id: `${customId.split(":modal_submit")[0]}:modal_complete`,
                title: str("REASON"),
                components: [
                    {
                        type: 1,
                        components: [
                            {
                                type: 4,
                                custom_id: "reason",
                                label: str("REASON"),
                                style: 2,
                                min_length: 1,
                                max_length: 1024,
                                required: true,
                                placeholder: str("TICKET_CLOSE_PLACEHOLDER"),
                            },
                        ],
                    },
                ],
            }),
        unbanReason: (customId, server, str, member, prefix) =>
            modal({
                id: `${prefix}:unban_modal:${customId.split(":")[1]}`,
                title: `${str("UNBAN_FROM")} ${server.name}`,
                components: [
                    {
                        type: 1,
                        components: [
                            {
                                type: 4,
                                label: str("REASON"),
                                custom_id: "reason",
                                style: 2,
                                min_length: 1,
                                max_length: 512,
                                required: true,
                                value: `${str("NO_REASON")} | ${str("BY")}: ${member.user.tag} (${member.id})`,
                            },
                        ],
                    },
                ],
            }),

        custom: (options = { title: "", components: [] }, { prefix, str } = {}) =>
            modal({
                id: `${prefix}:modal_submit`,
                title: options?.title || str("CREATE_TICKET"),
                components:
                    options?.components?.length >= 1
                        ? options.components
                        : [
                              {
                                  type: 1,
                                  components: [
                                      {
                                          type: 4,
                                          min_length: 10,
                                          max_length: 4000,
                                          custom_id: "message",
                                          label: str("MODAL_CONTENT"),
                                          style: 2,
                                          placeholder: str("MODAL_CONTENT_PLACEHOLDER"),
                                          required: true,
                                      },
                                  ],
                              },
                          ],
            }),
    },

    getModalComponents: (questions) => {
        return questions.length >= 1
            ? questions.slice(0, 5).map((c) => ({
                  type: 1,
                  components: [
                      {
                          min_length: c.min_length || 10,
                          max_length: c.max_length || 4000,
                          type: 4,
                          style: c.style || 2,
                          label: c.label,
                          value: c.value,
                          placeholder: c.placeholder,
                          required: c.required,
                          custom_id: c.label || `random_${Math.floor(Math.random() * 10000)}`,
                      },
                  ],
              }))
            : [];
    },
};

/**
 * @param {object} options
 * @param {string} [options.userId]
 * @param {string} [options.token]
 * @param {import("discord.js").Guild} [options.guild]
 * @returns {boolean}
 */
exports.hasTicket = ({ userId, guild, token, prefix } = {}) => {
    if (!userId || !guild || !token || !prefix || !guild?.channels?.cache?.size) {
        return false;
    }
    return guild.channels.cache.filter((c) => [0, "GUILD_TEXT"].includes(c.type) && c.topic && exports.code(c.topic.split("ID: ")[1], "d", token) === userId && c.name?.match?.(new RegExp(prefix, "gi"))).size ? true : false;
};

exports.embed = (content, { color, title, guild, footer, author, str, description } = {}) => ({
    title: title || str("INFO"),
    description: content || description,
    color: color || 0xff0000,
    timestamp: new Date(),
    footer,
    author: author || {
        name: guild?.name ?? str("TICKETS"),
        icon_url: guild?.iconURL?.({ dynamic: true }) ?? make.emojiURL(exports.emojis.tickets),
    },
});

exports.webhook = (options) => {
    const { id, token, username, avatar, threadId } = options;
    return new Webhook(`https://discord.com/api/v10/webhooks/${id}/${token}`, {
        username,
        avatar_url: avatar,
        threadId,
    });
};

/**
 * @param {import("@elara-services/tickets").TicketOptions} options
 * @param {string} username
 */
exports.getWebhookInfo = async (options, username = "Tickets") => {
    if (options.webhook?.channelId) {
        const channel = options.client.channels.resolve(options.webhook.channelId);
        if (channel) {
            const hook = await new BotHook(options.client.token).fetch(channel.isThread() ? channel.parentId : channel.id);
            if (hook) {
                options.webhook.id = hook.id;
                options.webhook.token = hook.token;
                options.webhook.threadId = channel.isThread() ? channel.id : undefined;
            }
        }
    }
    return {
        id: options.webhook?.id,
        token: options.webhook?.token,
        threadId: options.webhook?.threadId,
        username: options.webhook?.username || username,
        avatar: options.webhook?.avatar || make.emojiURL(exports.emojis.tickets),
    };
};

exports.getAppealServer = ({ appeals, client } = {}) => {
    if (!appeals?.enabled || !appeals?.mainserver?.checkIfBanned) {
        return null;
    }
    let server = client.guilds.resolve(appeals.mainserver?.id);
    return server?.available === true ? server : null;
};
