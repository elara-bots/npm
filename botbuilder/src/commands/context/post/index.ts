import { embedComment, error, is } from "@elara-services/utils";
import {
    ApplicationCommandType,
    ComponentType,
    ContextMenuCommandBuilder,
    Interaction,
    MessageCreateOptions,
    MessagePayload,
    PermissionResolvable,
    TextInputBuilder,
    TextInputStyle,
} from "discord.js";
import { MessageContextMenuCommand, buildCommand } from "../..";
const valid = ["yes", "ye", "y"];
const defImages = [
    "https://media.tenor.com/Hirj-cwKT0oAAAAd/roll-rick.gif",
    "https://media.tenor.com/CWgfFh7ozHkAAAAC/rick-astly-rick-rolled.gif",
];

export async function handlePostInteraction(i: Interaction) {
    if (!i.isModalSubmit() || !i.channel) {
        return;
    }
    if (!i.customId.startsWith("bot_post:")) {
        return;
    }
    await i.deferReply({ ephemeral: true }).catch(() => null);
    const [, id] = i.customId.split(":");
    const content = i.fields.getTextInputValue("content");
    const should = i.fields.getTextInputValue("should");
    const should_ping = i.fields.getTextInputValue("should_ping");
    const shouldEmbed = i.fields.getTextInputValue("embed");
    const data: MessagePayload | MessageCreateOptions = {
        content,
        allowedMentions: {
            repliedUser: ["yes", "ye", "y"].includes(should_ping)
                ? true
                : false,
        },
    };
    if (valid.includes(should)) {
        data["reply"] = {
            messageReference: id,
            failIfNotExists: false,
        };
    }
    if (valid.includes(shouldEmbed)) {
        delete data.content;
        data["embeds"] = embedComment(content, "DarkButNotBlack").embeds;
    }
    if (is.string(data.content) && data.content.length > 2000) {
        delete data.content;
        data["embeds"] = embedComment(content, "DarkButNotBlack").embeds;
    }
    if ("send" in i.channel) {
        await i.channel.send(data).catch(() => null);
    }
    return i.deleteReply().catch(() => null);
}

export function buildPostCommand(
    name = "RickRoll?",
    locked?: {
        roles?: string[];
        users?: string[];
        permissions?: PermissionResolvable[];
    },
    images: string[] = defImages,
) {
    return buildCommand<MessageContextMenuCommand>({
        command: new ContextMenuCommandBuilder()
            .setName(name)
            .setDMPermission(false)
            .setType(ApplicationCommandType.Message),
        async execute(i, r) {
            if (!i.inCachedGuild()) {
                return;
            }
            const denied = () =>
                r.reply({
                    content:
                        images[Math.floor(Math.random() * images.length)] ||
                        "You don't have access to this command.",
                    ephemeral: true,
                });
            let canUse = false;
            if (is.object(locked)) {
                if (
                    is.array(locked.roles) &&
                    i.member.roles.cache.hasAny(...locked.roles)
                ) {
                    canUse = true;
                }
                if (
                    is.array(locked.users) &&
                    locked.users.includes(i.user.id)
                ) {
                    canUse = true;
                }
                if (
                    is.array(locked.permissions) &&
                    !i.member.permissions.any(locked.permissions)
                ) {
                    canUse = true;
                }
            }
            if (!canUse) {
                return denied();
            }
            return i
                .showModal({
                    customId: `bot_post:${i.targetId}`,
                    title: "Send Message",
                    components: [
                        {
                            type: ComponentType.ActionRow,
                            components: [
                                new TextInputBuilder()
                                    .setCustomId("content")
                                    .setLabel("Content")
                                    .setMinLength(1)
                                    .setMaxLength(4000)
                                    .setRequired(true)
                                    .setStyle(TextInputStyle.Paragraph),
                            ],
                        },
                        {
                            type: ComponentType.ActionRow,
                            components: [
                                new TextInputBuilder()
                                    .setCustomId("should")
                                    .setLabel(`Should reply? (y/n)`)
                                    .setMinLength(1)
                                    .setMaxLength(3)
                                    .setRequired(true)
                                    .setValue("y")
                                    .setStyle(TextInputStyle.Short),
                            ],
                        },
                        {
                            type: ComponentType.ActionRow,
                            components: [
                                new TextInputBuilder()
                                    .setCustomId("should_ping")
                                    .setLabel(`Ping User? (y/n)`)
                                    .setMinLength(1)
                                    .setMaxLength(3)
                                    .setRequired(true)
                                    .setValue("y")
                                    .setStyle(TextInputStyle.Short),
                            ],
                        },
                        {
                            type: ComponentType.ActionRow,
                            components: [
                                new TextInputBuilder()
                                    .setCustomId("embed")
                                    .setLabel(`Should be an embed? (y/n)`)
                                    .setMinLength(1)
                                    .setMaxLength(3)
                                    .setRequired(true)
                                    .setValue("n")
                                    .setStyle(TextInputStyle.Short),
                            ],
                        },
                    ],
                })
                .catch(error);
        },
    });
}
