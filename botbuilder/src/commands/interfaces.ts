import {
    XOR,
    getFilesList,
    getInteractionResponders,
    getMessageResponders,
    type SubCommand as Sub,
} from "@elara-services/utils";

import type {
    AutocompleteInteraction,
    ChatInputCommandInteraction,
    ContextMenuCommandBuilder,
    GuildMember,
    Message,
    MessageContextMenuCommandInteraction,
    SlashCommandBuilder as SBuild,
    SlashCommandOptionsOnlyBuilder,
    UserContextMenuCommandInteraction,
} from "discord.js";
export type CachedInt = ChatInputCommandInteraction;
export type AnyBuilder = XOR<SlashCommandOptionsOnlyBuilder, SBuild>;

export type Defer<I> = XOR<
    {
        silent: boolean;
    },
    {
        filter: (i: I) => boolean;
    }
>;

export type Status = { status: true } | { status: false; message: string };

export type Pre = Promise<Status | boolean> | Status | boolean;

export type IntOptions = {
    roles?: string[];
    users?: string[];
    channels?: string[];
    permissions?: (member: GuildMember) => Status;
};

export interface PageData {
    id: string;
    data: unknown;
}

export interface AddPageData {
    id?: string;
    data: unknown;
}

export type OnlyOptions = {
    guild?: boolean;
    threads?: boolean;
    text?: boolean;
    voice?: boolean;
    dms?: boolean;
    /** Guild ids to register the commands in only. */
    guilds?: string[];
};

export interface Common<T> {
    enabled?: boolean;
    defer?: Defer<T>;
    aliases?: string[];
    locked?: IntOptions;
    disabled?: IntOptions;
    only?: OnlyOptions;
    execute: (i: T, r: getInteractionResponders) => Promise<unknown> | unknown;
    pre?: (interaction: T, cmd: SlashCommand) => Pre;
    autocomplete?: (i: AutocompleteInteraction) => Promise<unknown> | unknown;
}

export interface SubCommand extends Sub, Omit<Common<CachedInt>, "aliases"> {}

export interface SlashCommand extends Common<CachedInt> {
    command:
        | Partial<AnyBuilder>
        | ((builder: Partial<AnyBuilder>) => Partial<AnyBuilder>);
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
    execute(
        message: Message,
        responder: getMessageResponders,
    ): Promise<unknown> | unknown;
    pre?: (message: Message, cmd: PrefixCommand) => Pre;
}

export { getFilesList };
