import { getFilesList, type SubCommand as Sub } from "@elara-services/utils";

import type {
    ChatInputCommandInteraction,
    ContextMenuCommandBuilder,
    Message,
    MessageContextMenuCommandInteraction,
    SlashCommandBuilder as SBuild,
    UserContextMenuCommandInteraction,
} from "discord.js";
export type CachedInt = ChatInputCommandInteraction;

type IntOptions = {
    roles?: string[];
    users?: string[];
    channels?: string[];
};
type OnlyOptions = {
    guild?: boolean;
    threads?: boolean;
    text?: boolean;
    voice?: boolean;
    dms?: boolean;
};

interface Common<T> {
    enabled?: boolean;
    defer?: {
        silent: boolean;
    };
    aliases?: string[];
    locked?: IntOptions;
    disabled?: IntOptions;
    only?: OnlyOptions;
    execute: (interaction: T) => Promise<unknown> | unknown;
    pre?: (interaction: T, cmd: SlashCommand) => Promise<boolean> | boolean;
}

export interface SubCommand extends Sub, Omit<Common<CachedInt>, "aliases"> {}

export interface SlashCommand extends Common<CachedInt> {
    command: Partial<SBuild> | ((builder: Partial<SBuild>) => Partial<SBuild>);
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
    enabled?: boolean;
    aliases?: string[];
    locked?: IntOptions;
    disabled?: IntOptions;
    only?: OnlyOptions;
    execute(message: Message): Promise<unknown> | unknown;
    pre?: (message: Message, cmd: PrefixCommand) => Promise<boolean> | boolean;
}

export { getFilesList };
