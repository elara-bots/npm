import { embedComment, getRandom, is, noop } from "@elara-services/utils";
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
        // @ts-ignore
        data["embeds"] = embedComment(content, "DarkButNotBlack").embeds;
    }
    if (is.string(data.content) && data.content.length > 2000) {
        delete data.content;
        // @ts-ignore
        data["embeds"] = embedComment(content, "DarkButNotBlack").embeds;
    }
    if ("send" in i.channel) {
        await i.channel.send(data).catch(() => null);
    }
    return i.deleteReply().catch(() => null);
}

function createTextInput(options: {
    label: string;
    id: string;
    min?: number;
    max?: number;
    required?: boolean;
    value?: string;
    style?: TextInputStyle;
    placeholder?: string;
}) {
    const text = new TextInputBuilder()
        .setCustomId(options.id)
        .setLabel(options.label)
        .setMinLength(is.number(options.min) ? options.min : 1)
        .setMaxLength(is.number(options.max) ? options.max : 3)
        .setRequired(is.boolean(options.required) ? options.required : true)
        .setStyle(options.style || TextInputStyle.Short);
    if (is.string(options.placeholder)) {
        text.setPlaceholder(options.placeholder);
    }
    if (is.string(options.value)) {
        text.setValue(options.value);
    }
    return {
        type: ComponentType.ActionRow,
        components: [text],
    };
}

export function buildPostCommand(
    name = "RickRoll?",
    locked?: Partial<{
        roles?: string[];
        users?: string[];
        permissions?: PermissionResolvable[];
    }>,
    images: string[] = defImages,
) {
    const command = new ContextMenuCommandBuilder()
        .setName(name)
        .setType(ApplicationCommandType.Message);
    if ("setContexts" in command) {
        command.setContexts([0]); // Sets the context to only `GUILD` (NO DMS/GROUP_DM)
    }
    if ("setDMPermission" in command) {
        command.setDMPermission(false);
    }
    return buildCommand<MessageContextMenuCommand>({
        command,
        async execute(i, r) {
            if (!i.inCachedGuild()) {
                return;
            }
            let canUse = false;
            if (is.object(locked, true)) {
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
                return r.reply({
                    content:
                        getRandom(images) ||
                        "You don't have access to this command.",
                    ephemeral: true,
                });
            }
            return i
                .showModal({
                    customId: `bot_post:${i.targetId}`,
                    title: "Send Message",
                    components: [
                        createTextInput({
                            id: "content",
                            label: "Content",
                            max: 4000,
                            style: TextInputStyle.Paragraph,
                        }),
                        createTextInput({
                            id: "should",
                            label: "Should reply? (y/n)",
                            value: "y",
                        }),
                        createTextInput({
                            id: `should_ping`,
                            label: "Ping User? (y/n)",
                            value: "y",
                        }),
                        createTextInput({
                            id: `embed`,
                            label: `Should be an embed? (y/n)`,
                            value: "n",
                        }),
                    ],
                })
                .catch(noop);
        },
    });
}
