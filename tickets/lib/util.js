const { AES } = require("@elara-services/packages"),
      { Collection, version } = require("discord.js"),
        Webhook = require("discord-hook");

exports.code = (message, type = "d", token) => {
    if (!message || !type) return "";
    if (!token) return message;
    try {
        const aes = new AES(token);
        switch (type) {
            case "e": return aes.encrypt(message);
            case "d": return aes.decrypt(message);
        }
    } catch {
        return message;
    }
}

exports.de = {
    user: "<:Members:860931214232125450>",
    channel: "<:Channel:841654412509839390>",
    transcript: "<:Log:792290922749624320>"
}

exports.fetchMessages = async (channel, limit = 50, before, after, around) => {
    if (limit && limit > 100) {
        let logs = [];
        const get = async (_before, _after) => {
            const messages = [...(await channel.messages.fetch({ limit: 100, before: _before || undefined, after: _after || undefined }).catch(() => new Collection())).values()];
            if (limit <= messages.length) {
                return (_after ? messages.slice(messages.length - limit, messages.length).map((message) => message).concat(logs) : logs.concat(messages.slice(0, limit).map((message) => message)));
            }
            limit -= messages.length;
            logs = (_after ? messages.map((message) => message).concat(logs) : logs.concat(messages.map((message) => message)));
            if (messages.length < 100) return logs;
            return get((_before || !_after) && messages[messages.length - 1].id, _after && messages[0].id);
        };
        return get(before, after);
    }
    return [...(await channel.messages.fetch({ limit, before, after, around }).catch(() => new Collection())).values()];
};

exports.displayMessages = (channel, messages = [], ticketID, type) => {
    let users = [];
    for (const i of messages.values()) {
        let f = users.find(c => c.user.id === i.author.id);
        if (f) f.count++; else users.push({ user: i.author, count: 1 });
    };
    return [`<discord-messages>`, `<discord-message author="${type} Ticket: ${ticketID}" bot="true" verified avatar="https://cdn.discordapp.com/emojis/847397714677334066.png?v=1" role-color="#1da1f2">Total Messages: ${users.map(c => c.count).reduce((a, b) => a + b, 0).toLocaleString()}<br>${users.map(c => `<discord-mention type="role" color="${channel.guild?.members?.resolve?.(c.user.id)?.displayColor ? channel.guild?.members?.resolve?.(c.user.id)?.displayHexColor : `#ffffff`}">${c.user.tag}</discord-mention> (${c.user.id})`).join("<br>")}</discord-message></discord-messages><discord-messages>`,
        ...messages.map(message => {
            let str = [
                `<discord-message${message.author.bot ? ` bot="true" ${message.author.flags?.has?.(version?.includes?.("14") ? 1 << 16 : "VERIFIED_BOT") ? `verified="true"` : ""}` : ""} new_timestamp="${message.createdAt.toISOString()}" author="${message.author.username}" avatar=${message.author.displayAvatarURL({ dynamic: true, format: "png" })} role-color="${channel.guild?.members?.resolve?.(message.author.id)?.displayColor ? channel.guild?.members?.resolve?.(message.author.id)?.displayHexColor : `#ffffff`}">`
            ];
            if (message.content) {
                let content = message.content;
                if (message.mentions.users.size) for (const user of message.mentions.users.values()) content = content.replace(new RegExp(`<@!?${user.id}>`, "g"), `<discord-mention type="role" color="${message.guild?.members?.resolve?.(user?.id)?.displayHexColor ?? "#ffffff"}">${user.tag}</discord-mention>`);
                if (message.mentions.channels.size) for (const channel of message.mentions.channels.values()) content = content.replace(new RegExp(channel.toString(), "g"), `<discord-mention type="channel">${channel.name}</discord-mention>`);
                if (message.mentions.roles.size) for (const role of message.mentions.roles.values()) content = content.replace(new RegExp(role.toString(), "g"), `<discord-mention type="role" color="${role.hexColor}">${role.name}</discord-mention>`)
                str.push(content)
            };
            if (message.embeds?.length) {
                let arr = [`<discord-embeds slot="embeds">`];
                for (const embed of message.embeds) {
                    let emb = [
                        `<discord-embed slot="embed" ${embed.thumbnail?.url ? `thumbnail="${embed.thumbnail.url}"` : ""} ${embed.image?.url ? `image="${embed.image.url}"` : ""} ${embed.author ? `${embed.author.name ? `author-name="${embed.author.name}"` : ""} ${embed.author.iconURL ? `author-image="${embed.author.iconURL}"` : ""} ${embed.author.url ? `author-url="${embed.author.url}"` : ""}` : ""} ${embed.title ? `embed-title="${embed.title}"` : ""}${embed.color ? `color="${embed.hexColor}"` : ""}>`
                    ];
                    if (embed.description) emb.push(`<discord-embed-description slot="description">${embed.description}</discord-embed-description>`);
                    if (embed.fields?.length) {
                        emb.push(`<discord-embed-fields slot="fields">`)
                        for (const field of embed.fields) emb.push(`<discord-embed-field field-title="${field.name}" ${field.inline ? `inline` : ""}>${field.value}</discord-embed-field>`)
                    }
                    arr.push(...emb, `</discord-embed>`)
                }
                str.push(...arr, "</discord-embeds>")
            }
            if (message.interaction?.user) str.push(`<discord-command slot="reply" command="${message.interaction.type === "APPLICATION_COMMAND" ? "/" : ""}${message.interaction.commandName}" profile="${message.interaction.user.id}" role-color="${channel.guild?.members?.resolve?.(message.interaction.user?.id)?.displayHexColor || "#fffff"}" author="${message.interaction.user.tag}" avatar="${message.interaction.user.displayAvatarURL({ dynamic: true })}"></discord-command>`)
            if (message.components?.length) {
                let row = [
                    `<discord-attachments slot="components">`
                ],
                    styles = {
                        "PRIMARY": "primary",
                        "SECONDARY": "secondary",
                        "SUCCESS": "success",
                        "DANGER": "destructive",
                        "LINK": "secondary"
                    }
                for (const components of message.components) {
                    row.push(`<discord-action-row>`)
                    for (const c of components.components) {
                        if (c.type === "BUTTON") row.push(`<discord-button ${c.disabled ? `disabled=true` : ""} type="${styles[c.style]}" ${c.emoji?.name ? `emoji-name="${c.emoji.name}"` : ""} ${c.emoji?.id ? `emoji="https://cdn.discordapp.com/emojis/${c.emoji.id}.${c.emoji.animated ? "gif" : "png"}"` : ""} ${c.url ? `url="${c.url}"` : ""}>${c.label || ""}</discord-button>`)
                    }
                    row.push(`</discord-action-row>`)
                }
                if (row.length >= 2) str.push(...row, `</discord-attachments>`)
            }
            if (message.attachments.size) str.push(message.attachments.map((c) => `<a href="${c.proxyURL}">${c.name}</a>`).join("<br>"))
            str.push(`${message.content?.length ? `<br><br>` : ""}<code style="background-color: #36393e; color: white;">ID: ${message.id}</code>`)
            return [...str, `</discord-message>`].join(" ");
        }),
        "</discord-messages>"].join(" ");
};
/**
 * @param {object} options
 * @param {string} [options.userId]
 * @param {string} [options.token]
 * @param {import("discord.js").Guild} [options.guild] 
 * @returns {boolean}
 */
exports.hasTicket = ({ userId, guild, token, prefix } = {}) => {
    if (!userId || !guild || !token || !prefix || !guild?.channels?.cache?.size) return false;
    let channels = guild.channels.cache.filter(c => [ 0, "GUILD_TEXT" ].includes(c.type) && c.topic && exports.code(c.topic.split("ID: ")[1], "d", token) === userId && c.name?.match?.(new RegExp(prefix, "gi")));
    if (!channels.size) return false;
    return true; 
};

exports.embed = (content, { color, title, guild, footer, author } = {}) => ({ 
    title: title || "INFO", description: content, 
    color: color || 0xFF0000, timestamp: new Date(),
    footer,
    author: author || { name: guild?.name ?? "Tickets", icon_url: guild?.iconURL?.({ dynamic: true }) ?? "https://cdn.discordapp.com/emojis/818757771310792704.png?v=1" } 
});

exports.webhook = (options) => {
    const { id, token, username, avatar } = options;
    return new Webhook(`https://discord.com/api/webhooks/${id}/${token}`, { username, avatar_url: avatar });
};

exports.getWebhookInfo = (options) => {
    return {
        id: options.webhook?.id,
        token: options.webhook?.token,
        username: options.webhook?.username || "Tickets",
        avatar: options.webhook?.avatar || "https://cdn.discordapp.com/emojis/818757771310792704.png?v=1"
    }
};

exports.getAppealServer = ({ appeals, client } = {}) => {
    if (!appeals?.enabled || !appeals?.mainserver?.checkIfBanned) return null;
    let server = client.guilds.resolve(appeals.mainserver?.id);
    if (!server?.available) return null;
    return server;
}