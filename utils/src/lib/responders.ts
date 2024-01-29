import { EmbedBuilder } from "@discordjs/builders";
import {
    APIModalInteractionResponseCallbackData,
    Collection,
    InteractionDeferUpdateOptions,
    JSONEncodable,
    ModalComponentData,
    RepliableInteraction,
    SlashCommandBuilder as SBuild,
    SlashCommandSubcommandBuilder as SSBuild,
    type ChatInputCommandInteraction,
    type EmojiIdentifierResolvable,
    type InteractionDeferReplyOptions,
    type InteractionEditReplyOptions,
    type InteractionReplyOptions,
    type InteractionResponse,
    type Message,
    type MessageCreateOptions,
    type MessageEditOptions,
    type MessagePayload,
    type MessageReaction,
    type MessageReplyOptions,
    InteractionUpdateOptions,
} from "discord.js";
import { DefaultColors, colors, error, getFilesList, resolveColor, sleep } from ".";

export type TextBasedChannelSendOption = string | MessagePayload | MessageCreateOptions;

export type CommonInteractionEditReplyOptions = string | MessagePayload | InteractionEditReplyOptions;

// @see Parameters<ButtonInteraction["update"]>
export type CommonInteractionUpdateOptions = string | MessagePayload | InteractionUpdateOptions;
export type MessageReplyOption = string | MessagePayload | MessageReplyOptions;
export type MessageEditOption = string | MessagePayload | MessageEditOptions;
export function embed(): EmbedBuilder {
    return new EmbedBuilder();
}
export function comment(description: string, color: keyof typeof DefaultColors | string | number, toJSON = false) {
    const em = embed()
        .setDescription(description)
        .setColor(resolveColor(color) || colors.red);
    if (toJSON) {
        return em.toJSON();
    }
    return em;
}

export function getInteractionResponder(interaction: RepliableInteraction, handleErrors = error) {
    return {
        reply: async (options: InteractionReplyOptions): Promise<void | (InteractionResponse | Message)> => {
            if (interaction.deferred) {
                if ("ephemeral" in options) {
                    delete options["ephemeral"];
                }
                return interaction.editReply(options).catch(handleErrors);
            }
            return interaction.reply(options).catch(handleErrors);
        },
        defer: async (options?: InteractionDeferReplyOptions): Promise<void | InteractionResponse> => {
            if (interaction.deferred) {
                return;
            }
            return interaction.deferReply(options).catch(handleErrors);
        },

        edit: async (options: CommonInteractionEditReplyOptions): Promise<void | Message> => {
            if (!interaction.deferred) {
                return;
            }
            return interaction.editReply(options).catch(handleErrors);
        },
        send: async (options: TextBasedChannelSendOption): Promise<void | Message> => {
            if (!interaction.channel || !interaction.channel.isTextBased()) {
                return;
            }
            return interaction.channel.send(options).catch(handleErrors);
        },

        update: async (options: CommonInteractionUpdateOptions): Promise<void | InteractionResponse> => {
            if (!interaction.isButton() && !interaction.isAnySelectMenu()) {
                return;
            }
            return interaction.update(options).catch(() => void null);
        },

        deleteReply: async (timeout = 0): Promise<void | InteractionResponse> => {
            if (timeout > 0) {
                await sleep(timeout);
            }
            return interaction.deleteReply().catch(() => void null);
        },
        deferUpdate: async (options?: InteractionDeferUpdateOptions): Promise<void | InteractionResponse> => {
            if (!interaction.isButton() && !interaction.isModalSubmit() && !interaction.isAnySelectMenu()) {
                return;
            }
            if (interaction.deferred) {
                // If it's already deferred, ignore.
                return;
            }
            return interaction.deferUpdate(options).catch(() => void null);
        },

        followUp: async (options: InteractionReplyOptions): Promise<void | Message> => {
            return interaction.followUp(options).catch(() => void null);
        },
        showModal: async (options: APIModalInteractionResponseCallbackData | ModalComponentData | JSONEncodable<APIModalInteractionResponseCallbackData>) => {
            if (!interaction.isAnySelectMenu() && !interaction.isButton() && !interaction.isCommand()) {
                return;
            }
            return interaction.showModal(options).catch(() => void null);
        },
        raw: interaction,
    };
}

export function getMessageResponder(message: Message) {
    return {
        loading: async (str?: string) => {
            return message
                .reply({
                    embeds: [comment(str || `Loading, one moment...`, colors.orange, true)],
                    failIfNotExists: false,
                })
                .catch(error);
        },

        delete: async (timeout = 0) => {
            if (timeout <= 0) {
                return message.delete().catch(error);
            }
            await sleep(timeout);
            return message.delete().catch(error);
        },

        reply: async (options: MessageReplyOption): Promise<void | Message> => {
            return await message.reply(options).catch(error);
        },
        send: async (options: TextBasedChannelSendOption) => {
            if (!message.channel || !message.channel.isTextBased()) {
                return;
            }
            const sentMessage = await message.channel.send(options).catch(error);
            if (!sentMessage) {
                return sentMessage;
            }

            return getMessageResponder(sentMessage);
        },
        react: async (options: EmojiIdentifierResolvable): Promise<void | MessageReaction> => {
            return message.react(options).catch(error);
        },
        edit: async (options: MessageEditOption): Promise<void | Message> => {
            return message.edit(options).catch(error);
        },
        raw: message,
        args: message.content.split(/ +/g).slice(1),
    };
}

export type getInteractionResponders = ReturnType<typeof getInteractionResponder>;
export type getMessageResponders = ReturnType<typeof getMessageResponder>;

export function handleSubCommands<T extends ChatInputCommandInteraction, F>(interaction: T, files: F) {
    const responder = getInteractionResponder(interaction);
    const subCommandArg = interaction.options.getSubcommand();
    if (!(files instanceof Collection)) {
        return;
    }
    const command = files.get(subCommandArg);
    if (!command) {
        return responder.reply({
            embeds: [comment(`I was unable to find that sub command`, "#FF0000", true)],
            ephemeral: true,
        });
    }
    return command.execute(interaction, responder);
}

export interface SubCommand {
    subCommand: (builder: SSBuild) => SSBuild;
}

export function buildSubCommand<T extends SubCommand>(builder: SBuild | ((builder: SBuild) => SBuild), commands: object) {
    const command = typeof builder === "function" ? builder(new SBuild()) : builder;
    const subCommands = getFilesList<T>(commands);
    if (subCommands.size) {
        for (const subCommand of subCommands.values()) {
            if (!subCommand) {
                throw new Error("Unable to create slash command");
            }
            command.addSubcommand(subCommand.subCommand);
        }
    }

    return command;
}
