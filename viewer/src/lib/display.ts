import {
    XOR,
    formatNumber,
    hasBit,
    is,
    make,
    proper,
    snowflakes,
} from "@elara-services/utils";
import {
    APIButtonComponent,
    APIEmbed,
    APIMessage,
    APIMessageInteraction,
    ButtonStyle,
    ComponentType,
    InteractionType,
    MessageType,
    StickerFormatType,
} from "discord-api-types/v10";
import { writeFileSync } from "fs";
import { createHTMLPage } from "./html";
import type {
    Color,
    HTMLPageOptions,
    InviteData,
    MentionTypes,
    MessageOptions,
    MinMessage,
} from "./interfaces";
import {
    StickerTypes,
    SystemJoinMessages,
    convertV13MessageType,
    styles,
} from "./utils";

export const create = {
    file: (
        dir: string,
        messages: string | string[],
        options?: HTMLPageOptions
    ) => {
        return writeFileSync(dir, create.buffer(messages, options));
    },

    buffer: (messages: string | string[], options?: HTMLPageOptions) => {
        return Buffer.from(create.page(messages, options));
    },

    page: (messages: string | string[], options?: HTMLPageOptions) => {
        return createHTMLPage(
            is.array(messages)
                ? messages.join("")
                : `<discord-messages>${messages}</discord-messages>`,
            options
        );
    },

    withHeaderMessage: (
        header: {
            message: Partial<XOR<APIMessage, MinMessage>>;
            guildName?: string;
            options?: MessageOptions;
        },
        messages: string[] | string,
        htmlPage?: HTMLPageOptions
    ) => {
        return createHTMLPage(
            `<discord-messages>
            ${create.message(header.message, header.guildName, header.options)}
            </discord-messages>${
                is.array(messages)
                    ? messages.join("")
                    : `<discord-messages>${messages}</discord-messages>`
            }`,
            htmlPage
        );
    },

    bulkMessages: (
        messages: string[] | string,
        options: {
            users: {
                count: number;
                id: string;
                username: string;
                discriminator?: string;
                color?: Color;
            }[];
            guildName: string;
            username?: string;
            avatar_url?: string;
            color?: Color;
        },
        htmlPage?: HTMLPageOptions
    ) => {
        return create.withHeaderMessage(
            {
                message: {
                    content: `<strong>Messages: </strong>${formatNumber(
                        options.users
                            .map((c) => c.count)
                            .reduce((a, b) => a + b, 0)
                            .toLocaleString()
                    )}<br><strong>Users</strong><br>${options.users
                        .map(
                            (c) =>
                                `[${formatNumber(c.count || 0)}]: ${create.role(
                                    `${c.username}${
                                        c.discriminator
                                            ? c.discriminator !== "0"
                                                ? `#${c.discriminator}`
                                                : ""
                                            : ""
                                    }`,
                                    c.color || `#ffffff`
                                )} (${c.id})` as string
                        )
                        .join("<br>")}`,
                },
                guildName: options.guildName,
                options: {
                    bot: true,
                    verified: true,
                    username: options.username,
                    avatar_url: options.avatar_url,
                },
            },
            messages,
            htmlPage
        );
    },

    ticket: (
        messages: string[] | string,
        options: {
            id: string;
            type: string;
            users: {
                count: number;
                id: string;
                username: string;
                discriminator?: string;
                color?: Color;
            }[];
            username?: string;
            avatar_url?: string;
            color?: string;
        },
        str: (str: string) => string = (str) => proper(str),
        htmlPage?: HTMLPageOptions
    ) => {
        return create.withHeaderMessage(
            {
                message: {
                    content: `${str("TOTAL_MESSAGES")}: ${options.users
                        .map((c) => c.count)
                        .reduce((a, b) => a + b, 0)
                        .toLocaleString()}<br>${options.users
                        .map(
                            (c) =>
                                `${create.role(
                                    `${c.username}${
                                        c.discriminator
                                            ? c.discriminator !== "0"
                                                ? `#${c.discriminator}`
                                                : ""
                                            : ""
                                    }`,
                                    c.color || `#ffffff`
                                )} (${c.id})`
                        )
                        .join("<br>")}`,
                },
                guildName: "Ticket Server",
                options: {
                    bot: true,
                    verified: true,
                    username:
                        options.username ||
                        `${options.type || "Support"} ${str("TICKET")}: ${
                            options.id
                        }`,
                    avatar_url:
                        options.avatar_url ||
                        `https://cdn.discordapp.com/emojis/847397714677334066.png`,
                },
            },
            messages,
            htmlPage || {
                name: `Ticket Logs`,
                icon: `https://cdn.discordapp.com/emojis/847397714677334066.png`,
                loadingMessage: `Please wait while the ticket information loads..`,
            }
        );
    },

    button: (data: APIButtonComponent) => {
        return `<discord-button ${data.disabled ? `disabled=true` : ""} type="${
            styles[data.style]
        }" ${data.emoji?.name ? `emoji-name="${data.emoji.name}"` : ""} ${
            data.emoji?.id
                ? `emoji="https://cdn.discordapp.com/emojis/${data.emoji.id}.${
                      data.emoji.animated ? "gif" : "png"
                  }"`
                : ""
        } ${
            data.style === ButtonStyle.Link && data.url
                ? `url="${data.url}"`
                : ""
        }>${data.label || ""}</discord-button>`;
    },

    embed: (data: APIEmbed) => {
        const emb = [
            `<discord-embed slot="embed" ${
                data.thumbnail?.url ? `thumbnail="${data.thumbnail.url}"` : ""
            } ${data.image?.url ? `image="${data.image.url}"` : ""} ${
                data.author
                    ? `${
                          data.author.name
                              ? `author-name="${data.author.name}"`
                              : ""
                      } ${
                          data.author.icon_url
                              ? `author-image="${data.author.icon_url}"`
                              : ""
                      } ${
                          data.author.url
                              ? `author-url="${data.author.url}"`
                              : ""
                      }`
                    : ""
            } ${data.title ? `embed-title="${data.title}"` : ""}${
                data.color ? `color="${data.color.toString(16)}"` : ""
            }>`,
        ];
        if (data.description) {
            emb.push(
                `<discord-embed-description slot="description">${data.description}</discord-embed-description>`
            );
        }
        if (data.fields?.length) {
            emb.push(`<discord-embed-fields slot="fields">`);
            for (const field of data.fields) {
                emb.push(
                    `<discord-embed-field field-title="${field.name}" ${
                        field.inline ? `inline` : ""
                    }>${field.value}</discord-embed-field>`
                );
            }
        }
        return [...emb, `</discord-embed>`].join("");
    },

    components: (buttons: (APIButtonComponent | string)[]) => {
        const data = buttons.map((c) => (is.string(c) ? c : create.button(c)));
        if (!is.array(data)) {
            return null;
        }
        return [
            `<discord-attachments slot="components">`,
            ...data,
            `</discord-attachments>`,
        ];
    },

    command: (data: APIMessageInteraction, memberColor = "#fffff") => {
        return `<discord-command slot="reply" command="${
            data.type === InteractionType.ApplicationCommand ? "/" : ""
        }${data.name}" profile="${data.user.id}" ${
            memberColor ? `role-color="${memberColor}"` : ""
        } author="${data.user.username}${
            data.user.discriminator !== "0" ? `#${data.user.discriminator}` : ""
        }" avatar="${make.image.users.avatar(
            data.user.id,
            data.user.avatar || undefined
        )}"></discord-command>`;
    },

    message: (
        m: Partial<XOR<APIMessage, MinMessage>>,
        guildName = "Unknown Server",
        options?: MessageOptions
    ) => {
        const createdAt = m.id
            ? snowflakes.get(m.id).date.toISOString()
            : new Date().toISOString();
        const extra = [];
        if (m.author?.bot === true || options?.bot === true) {
            extra.push(`bot="true"`);
        }
        let authorFlags = 0;
        if (m.author) {
            if (is.number(m.author.public_flags)) {
                authorFlags = m.author.public_flags;
            } else if (is.number(m.author.flags)) {
                authorFlags = m.author.flags;
                // @ts-ignore
            } else if ("bitfield" in m.author.flags) {
                // @ts-ignore
                authorFlags = m.author.flags.bitfield;
            }
        }
        // @ts-ignore
        if (hasBit(authorFlags, 1 << 16) || options?.verified === true) {
            extra.push(`verified="true"`);
        }
        if (options?.color) {
            extra.push(`role-color="${options.color}"`);
        }
        if (m.edited_timestamp) {
            extra.push(`edited="true"`);
        }
        if (is.string(m.type)) {
            m.type = convertV13MessageType(m.type);
        }
        const row: string[] = [
            `<discord-message ${extra.join(
                " "
            )} new_timestamp="${createdAt}" author="${
                options?.username || m.author?.username || "Discord"
            }" avatar=${
                options?.avatar_url ||
                make.image.users.avatar(
                    m.author?.id || "5",
                    m.author?.avatar || undefined
                )
            }>`,
        ];
        let content = create.content(m.author?.id || "123456789", {
            content: m.content || "",
            createdAt,
            guildName,
            type: m.type || MessageType.Default,
        });

        content = content
            .replace(
                /<id:browse>/gi,
                create.channel("Browse Channels", "channels-and-roles")
            )
            .replace(
                /<id:customize>/gi,
                create.channel("Channels & Roles", "customize-community")
            )
            .replace(
                /<id:guide>/gi,
                create.channel("Server Guide", "server-guide")
            );

        if (is.array(m.sticker_items)) {
            for (const a of m.sticker_items) {
                if (
                    [
                        StickerFormatType.APNG,
                        StickerFormatType.GIF,
                        StickerFormatType.PNG,
                        "png",
                        "gif",
                        "apng",
                    ].includes(a.format_type)
                ) {
                    row.push(
                        create.emoji({
                            name: a.name,
                            url: make.image.sticker(
                                a.id,
                                // @ts-ignore
                                StickerTypes[a.format_type]
                            ),
                        })
                    );
                } else {
                    row.push(
                        `<a href="${make.image.sticker(a.id, "json")}">${
                            a.name
                        }</a>`
                    );
                }
            }
        }

        if (is.array(m.attachments)) {
            row.push(
                `<discord-attachments slot="attachments">`,
                ...m.attachments.map(
                    (c) =>
                        `<discord-attachment slot="attachments" url="${c.url}"/>`
                ),
                `</discord-attachments>`
            );
        }
        if (is.string(content)) {
            row.push(content);
        }
        if (is.array(m.embeds)) {
            const str = [];
            for (const embed of m.embeds) {
                str.push(create.embed(embed));
            }
            if (is.array(str)) {
                row.push(`<discord-embeds>`, ...str, `</discord-embeds>`);
            }
        }
        if (is.array(m.components)) {
            const components = [];
            for (const c of m.components) {
                const actionRow = [];
                for (const r of c.components) {
                    if (r.type === ComponentType.Button) {
                        actionRow.push(create.button(r));
                    }
                }
                if (is.array(actionRow)) {
                    components.push(
                        `<discord-action-row>`,
                        ...actionRow,
                        `</discord-action-row>`
                    );
                }
            }
            if (is.array(components)) {
                row.push(
                    `<discord-attachments slot="components">`,
                    ...components,
                    `</discord-attachments>`
                );
            }
        }
        if (m.interaction) {
            row.push(create.command(m.interaction, options?.color));
        }
        return [...row, `</discord-message>`].join(" ");
    },

    messages: (
        messages: (Partial<XOR<APIMessage, MinMessage>> & {
            options?: MessageOptions;
        })[],
        guildName = "Unknown Server"
    ) => {
        return [
            `<discord-messages>`,
            ...messages.map((c) =>
                create.message(c, guildName, c.options ?? undefined)
            ),
            `</discord-messages>`,
        ].join("");
    },

    content: (
        userId: string,
        message: {
            content: string;
            createdAt: string;
            type: MessageType;
            guildName?: string;
        }
    ) => {
        const defaultContent = message.content || "";
        const types: Partial<Record<MessageType, string>> = {
            [MessageType.ChannelFollowAdd]: `<@${userId}> has added **${message.content}** to this channel. Its most important updates will show up here.`,
            [MessageType.ThreadCreated]: `<@${userId}> started a thread: **${message.content}**. See all **threads**`,
            [MessageType.UserJoin]: `${SystemJoinMessages[
                ~~(
                    new Date(message.createdAt).getTime() %
                    SystemJoinMessages.length
                )
            ].replace(/%user%/g, `<@${userId}>`)}`,
            [MessageType.ChannelPinnedMessage]: `<@${userId}> pinned **a message** to this channel. **See all the pins.**`,
            [MessageType.Default]: defaultContent,
            [MessageType.Reply]: defaultContent,
            [MessageType.GuildBoost]: `<:Boost:586883798550052864> <@${userId}> just boosted the server!`,
            [MessageType.GuildBoostTier1]: `<:Boost:586883798550052864> <@${userId}> just boosted the server. **${message.guildName}** has achieved Level 1!`,
            [MessageType.GuildBoostTier2]: `<:Boost:586883798550052864> <@${userId}> just boosted the server. **${message.guildName}** has achieved Level 2!`,
            [MessageType.GuildBoostTier3]: `<:Boost:586883798550052864> <@${userId}> just boosted the server. **${message.guildName}** has achieved Level 3!`,
        };

        return (types[message.type] ?? defaultContent ?? "")
            .replace(
                /<id:browse>/gi,
                create.channel("Browse Channels", "channels-and-roles")
            )
            .replace(
                /<id:customize>/gi,
                create.channel("Channels & Roles", "customize-community")
            )
            .replace(
                /<id:guide>/gi,
                create.channel("Server Guide", "server-guide")
            )
            .replace("||", "\\|\\|")
            .replace("||", "\\|\\|");
    },

    invite: (invite: InviteData, format = false) => {
        const online = invite.online || 0;
        const members = invite.total || 0;
        return `<discord-invite name=${invite.name || "Unknown Server"} icon="${
            invite.icon
        }" url="${invite.url}" online="${
            format ? online.toLocaleString() : online
        }" members="${
            format ? members.toLocaleString() : members
        }" partnered="${
            is.boolean(invite.partnered) ? invite.partnered : "false"
        }" verified="${
            is.boolean(invite.verified) ? invite.verified : "false"
        }"></discord-invite>`;
    },

    user: (name: string, color?: Color) => create.mention("user", name, color),
    role: (name: string, color?: Color) => create.mention("role", name, color),
    channel: (
        name: string,
        type: Exclude<MentionTypes, "user" | "role"> = "channel",
        color?: Color
    ) => create.mention(type, name, color),

    mention: (type: MentionTypes = "user", name: string, color?: Color) => {
        return `<discord-mention type="${type}" ${
            color
                ? `color="${
                      is.string(color) ? color : `#${color.toString(16)}`
                  }"`
                : ""
        }>${name}</discord-mention>`;
    },

    emoji: (data: { name?: string; url: string }, isForEmbed = false) =>
        `<discord-custom-emoji${
            is.string(data.name) ? ` name="${data.name}"` : ""
        } url="${data.url}"${
            isForEmbed ? ` embed-emoji` : ""
        }></discord-custom-emoji>`,

    sticker: (name: string, url: string, height = 250, width = 250) => {
        return `<discord-attachment${
            is.string(name) ? ` name="${name}"` : ""
        } url="${url}" height="${height}" width="${width}"></discord-attachment>`;
    },
};
