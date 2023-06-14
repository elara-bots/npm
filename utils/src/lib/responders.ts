import {
    MessagePayload,
    MessageCreateOptions,
    InteractionEditReplyOptions,
    EmbedBuilder,
    ChatInputCommandInteraction,
    InteractionReplyOptions,
    InteractionResponse,
    InteractionDeferReplyOptions,
    Message,
} from "discord.js";

export type TextBasedChannelSendOption =
    | string
    | MessagePayload
    | MessageCreateOptions;

export type CommonInteractionEditReplyOptions =
    | string
    | MessagePayload
    | InteractionEditReplyOptions;

export function embed(): EmbedBuilder {
    return new EmbedBuilder().setColor(0xff0092).setTimestamp();
}

export function getInteractionResponder(interaction: ChatInputCommandInteraction, handleErrors = log) {
    return {
        reply: async (
            options: InteractionReplyOptions
        ): Promise<void | InteractionResponse> => {
            return await interaction.reply(options).catch(handleErrors);
        },
        defer: async (
            options?: InteractionDeferReplyOptions
        ): Promise<void | InteractionResponse> => {
            return await interaction.deferReply(options).catch(handleErrors);
        },

        edit: async (
            options: CommonInteractionEditReplyOptions
        ): Promise<void | Message> => {
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

export type getInteractionResponders = {
    send: (options: TextBasedChannelSendOption) => Promise<void | Message>;
    edit: (
        options: CommonInteractionEditReplyOptions
    ) => Promise<void | Message>;
    defer: (
        options?: InteractionDeferReplyOptions
    ) => Promise<void | InteractionResponse>;
    reply: (
        options: InteractionReplyOptions
    ) => Promise<void | InteractionResponse>;
};

function log(e: unknown) {
    console.warn(e);
}