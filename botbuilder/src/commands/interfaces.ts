import type {
    getInteractionResponders,
    getMessageResponders,
    SubCommand as Sub,
} from "@elara-services/utils";

import type {
    ChatInputCommandInteraction,
    ContextMenuCommandBuilder,
    Message,
    MessageContextMenuCommandInteraction,
    SlashCommandBuilder as SBuild,
    UserContextMenuCommandInteraction,
} from "discord.js";
export type CachedInt = ChatInputCommandInteraction<"cached">;
export type Locked = "owner" | "staff";

interface Common<T> {
    execute: (
        interaction: T,
        responder: getInteractionResponders
    ) => Promise<unknown> | unknown;
}

export interface SubCommand extends Sub, Common<CachedInt> {}

export interface SlashCommand extends Common<CachedInt> {
    command: SBuild | ((builder: SBuild) => SBuild);
}

export interface UserContextMenuCommand
    extends Common<UserContextMenuCommandInteraction> {
    command: Partial<ContextMenuCommandBuilder>;
}

export interface MessageContextMenuCommand
    extends Common<MessageContextMenuCommandInteraction> {
    command: Partial<ContextMenuCommandBuilder>;
}

export interface PrefixCommand {
    name: string;
    locked: Locked[];
    execute(
        message: Message,
        responder: getMessageResponders
    ): Promise<unknown> | unknown;
}
