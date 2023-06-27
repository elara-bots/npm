import {
    Collection,
    EmbedBuilder,
    SlashCommandBuilder as SBuild,
    SlashCommandSubcommandBuilder as SSBuild,
    type ChatInputCommandInteraction,
    type ColorResolvable,
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
} from "discord.js";
import { getFilesList, sleep } from ".";

export type TextBasedChannelSendOption =
    | string
    | MessagePayload
    | MessageCreateOptions;

export type CommonInteractionEditReplyOptions =
    | string
    | MessagePayload
    | InteractionEditReplyOptions;

export type MessageReplyOption = string | MessagePayload | MessageReplyOptions;
export type MessageEditOption = string | MessagePayload | MessageEditOptions;
export function embed(): EmbedBuilder {
    return new EmbedBuilder();
}
export function comment(description: string, color: ColorResolvable) {
    return embed()
    .setDescription(description)
    .setColor(color || "Red");
}

export function getInteractionResponder(interaction: ChatInputCommandInteraction, handleErrors = log) {
    return {
        reply: async (
            options: InteractionReplyOptions
        ): Promise<void | (InteractionResponse | Message)> => {
            if (interaction.deferred) {
                if ("ephemeral" in options) {
                    delete options['ephemeral'];
                }
                return await interaction.editReply(options).catch(handleErrors);
            }
            return await interaction.reply(options).catch(handleErrors);
        },
        defer: async (
            options?: InteractionDeferReplyOptions
        ): Promise<void | InteractionResponse> => {
            if (interaction.deferred) {
                return;
            }
            return await interaction.deferReply(options).catch(handleErrors);
        },

        edit: async (
            options: CommonInteractionEditReplyOptions
        ): Promise<void | Message> => {
            if (!interaction.deferred) {
                return;
            }
            return await interaction.editReply(options).catch(handleErrors);
        },
        send: async (
            options: TextBasedChannelSendOption
        ): Promise<void | Message> => {
            if (!interaction.channel || !interaction.channel.isTextBased()) {
                return;
            }
            return await interaction.channel.send(options).catch(handleErrors);
        },
    };
}


export function getMessageResponder(message: Message) {
    return {
        delete: async (timeout = 0) => {
            if (timeout <= 0) {
                return message.delete().catch(log);
            }
            await sleep(timeout);
            return message.delete().catch(log);
        },

        reply: async (options: MessageReplyOption): Promise<void | Message> => {
            return await message.reply(options).catch(log);
        },
        send: async (options: TextBasedChannelSendOption) => {
            if (!message.channel || !message.channel.isTextBased()) {
                return;
            }
            const sentMessage = await message.channel
                .send(options)
                .catch(log);
            if (!sentMessage) {
                return sentMessage;
            }

            return getMessageResponder(sentMessage);
        },
        react: async (
            options: EmojiIdentifierResolvable
        ): Promise<void | MessageReaction> => {
            return await message.react(options).catch(log);
        },
        edit: async (options: MessageEditOption): Promise<void | Message> => {
            return await message.edit(options).catch(log);
        },
        raw: message,
        args: message.content.split(/ +/g).slice(1),
    };
}

function log(e: unknown) {
    console.warn(e);
}
export type getInteractionResponders = ReturnType<typeof getInteractionResponder>;
export type getMessageResponders = ReturnType<typeof getMessageResponder>;


export function handleSubCommands<T extends ChatInputCommandInteraction, F extends unknown>(interaction: T, files: F) {
    const responder = getInteractionResponder(interaction);
    const subCommandArg = interaction.options.getSubcommand();
    if (!(files instanceof Collection)) {
        return;
    }
    const command = files.get(subCommandArg);
    if (!command) {
      return responder.reply({
        content: `I was unable to find that sub command.`,
        ephemeral: true,
      });
    }
    return command.execute(interaction, responder);
}

export interface SubCommand {
    subCommand: (builder: SSBuild) => SSBuild
}

export function buildSubCommand<T extends SubCommand>(
    builder: SBuild | ((builder: SBuild) => SBuild),
    commands: object
) {
    const command = typeof builder === 'function' ? builder(new SBuild()) : builder;
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