import {
    commands,
    embedComment,
    getFilesList,
    is,
    log,
    XOR,
} from "@elara-services/utils";
import {
    ChatInputCommandInteraction,
    Collection,
    GuildMember,
    Interaction,
    Message,
    SlashCommandBuilder,
} from "discord.js";
import {
    MessageContextMenuCommand,
    PrefixCommand,
    SlashCommand,
    SubCommand,
    UserContextMenuCommand,
} from "./interfaces";

export * from "./deploy";
export * from "./interfaces";

export async function handleMessageCommand<
    M extends Message,
    C extends PrefixCommand,
>(
    message: M,
    cmds: Collection<string, C>,
    prefix: string,
    pre?: (message: M, cmd: C) => Promise<boolean> | boolean,
) {
    if (message.author.bot || !message.content) {
        return;
    }

    const data = commands(message.content, prefix);
    if (!data.hasPrefix()) {
        return;
    }
    const cmd = cmds.find(
        (c) =>
            c.name?.toLowerCase() === data.name?.toLowerCase() ||
            c.aliases?.some(
                (a) => a.toLowerCase() === data.name?.toLowerCase(),
            ),
    );
    if (!cmd) {
        return;
    }
    if (cmd.enabled === false) {
        return;
    }
    if (pre) {
        const p = await pre(message, cmd);
        if (!p) {
            return;
        }
    }
    if (cmd.pre) {
        const p = await cmd.pre(message, cmd);
        if (!p) {
            return;
        }
    }
    if (is.object(cmd.only)) {
        if (cmd.only.guild && !message.guild) {
            return;
        }
        if (cmd.only.text && !message.channel.isTextBased()) {
            return;
        }
        if (cmd.only.dms && message.guild) {
            return;
        }
        if (cmd.only.threads && !message.channel.isThread()) {
            return;
        }
        if (cmd.only.voice && !message.channel.isVoiceBased()) {
            return;
        }
    }
    const cs = [
        message.channelId,
        "parentId" in message.channel ? message.channel.parentId : null,
    ].filter((c) => c);
    if (is.object(cmd.locked)) {
        if (
            is.array(cmd.locked.channels) &&
            !cmd.locked.channels.some((c) => cs.includes(c))
        ) {
            return;
        }
        if (is.array(cmd.locked.roles)) {
            if (!message.member) {
                return;
            }
            if (!message.member.roles.cache.hasAny(...cmd.locked.roles)) {
                return;
            }
        }
        if (
            is.array(cmd.locked.users) &&
            !cmd.locked.users.includes(message.author.id)
        ) {
            return;
        }
    }
    if (is.object(cmd.disabled)) {
        if (
            is.array(cmd.disabled.channels) &&
            cmd.disabled.channels.some((c) => cs.includes(c))
        ) {
            return;
        }
        if (is.array(cmd.disabled.roles)) {
            if (!message.member) {
                return;
            }
            if (message.member.roles.cache.hasAny(...cmd.disabled.roles)) {
                return;
            }
        }
        if (
            is.array(cmd.disabled.users) &&
            cmd.disabled.users.includes(message.author.id)
        ) {
            return;
        }
    }

    return cmd.execute(message);
}

export async function handleInteractionCommand<
    I extends Interaction,
    C extends SlashCommand,
>(
    i: I,
    cmds: Collection<string, C>,
    pre?: (i: I, cmd: C) => Promise<boolean> | boolean,
    alwaysDefer?: { silent: boolean },
) {
    if (!i.isRepliable()) {
        return;
    }
    if (!("commandName" in i)) {
        return;
    }
    const cmd = cmds.find(
        (c) =>
            c.command.name === i.commandName ||
            c.aliases?.includes(i.commandName),
    );
    return handleCommands(i, cmd, pre, alwaysDefer);
}

export async function handleCommands<
    I extends Interaction,
    C extends SlashCommand,
>(
    i: I,
    cmd: C | undefined,
    pre?: (i: I, cmd: C) => Promise<boolean> | boolean,
    alwaysDefer?: { silent: boolean },
) {
    if (!i.isRepliable()) {
        return;
    }
    if (!("commandName" in i)) {
        return;
    }
    const reply = (content: string) => {
        if (i.deferred) {
            return i.editReply(embedComment(content)).catch(log);
        }
        return i
            .reply({
                ...embedComment(content),
                ephemeral: true,
            })
            .catch(log);
    };
    if (!cmd) {
        return reply(`Unable to find (${i.commandName}) command.`);
    }
    if (cmd.enabled === false) {
        return reply(`Command (${i.commandName}) isn't enabled.`);
    }
    if (is.object(alwaysDefer)) {
        await i
            .deferReply({ ephemeral: alwaysDefer.silent || false })
            .catch(() => null);
    } else if (is.object(cmd.defer)) {
        await i
            .deferReply({ ephemeral: cmd.defer.silent || false })
            .catch(() => null);
    }
    if (pre) {
        const p = await pre(i, cmd);
        if (!p) {
            return;
        }
    }
    if (cmd.pre) {
        // @ts-ignore
        const p = await cmd.pre(i, cmd);
        if (!p) {
            return;
        }
    }
    if (is.object(cmd.only)) {
        if (cmd.only.guild && !i.guild) {
            return reply(`This command can only be used in a server.`);
        }
        if (cmd.only.text && !i.channel?.isTextBased()) {
            return reply(
                `This command can only be used in a text-based channel.`,
            );
        }
        if (cmd.only.dms && i.guild) {
            return reply(
                `This command can only be used in Direct Messages (DM)`,
            );
        }
        if (cmd.only.threads && !i.channel?.isThread()) {
            return reply(`This command can only be used in thread channels.`);
        }
        if (cmd.only.voice && !i.channel?.isVoiceBased()) {
            return reply(`This command can only be used in voice channels.`);
        }
    }
    const cs = [
        i.channelId,
        i.channel
            ? "parentId" in i.channel
                ? i.channel.parentId
                : null
            : null,
    ].filter((c) => c);
    if (is.object(cmd.locked)) {
        if (
            is.array(cmd.locked.channels) &&
            !cmd.locked.channels.some((c) => cs.includes(c))
        ) {
            return reply(`You can't use the command in this channel.`);
        }
        if (is.array(cmd.locked.roles)) {
            if (!(i.member instanceof GuildMember)) {
                return reply(
                    `You don't have any roles that has access to this command.`,
                );
            }
            if (!i.member.roles.cache.hasAny(...cmd.locked.roles)) {
                return reply(
                    `You don't have any roles that has access to this command.`,
                );
            }
        }
        if (
            is.array(cmd.locked.users) &&
            !cmd.locked.users.includes(i.user.id)
        ) {
            return reply(`You don't have access to this command.`);
        }
    }
    if (is.object(cmd.disabled)) {
        if (
            is.array(cmd.disabled.channels) &&
            cmd.disabled.channels.some((c) => cs.includes(c))
        ) {
            return reply(`You can't use the command in this channel.`);
        }
        if (is.array(cmd.disabled.roles)) {
            if (!(i.member instanceof GuildMember)) {
                return reply(
                    `You have a role that doesn't have access to this command.`,
                );
            }
            if (i.member.roles.cache.hasAny(...cmd.disabled.roles)) {
                return reply(
                    `You have a role that doesn't have access to this command.`,
                );
            }
        }
        if (
            is.array(cmd.disabled.users) &&
            cmd.disabled.users.includes(i.user.id)
        ) {
            return reply(`You don't have access to this command.`);
        }
    }
    // @ts-ignore
    return cmd.execute(i);
}

export function handleSubCommands<T extends ChatInputCommandInteraction, F>(
    interaction: T,
    files: F,
    pre?: (i: Interaction, cmd: SubCommand) => Promise<boolean> | boolean,
    alwaysDefer?: { silent: boolean },
) {
    const subCommandArg = interaction.options.getSubcommand();
    if (!(files instanceof Collection)) {
        return;
    }
    return handleCommands(
        interaction,
        files.get(subCommandArg),
        pre,
        alwaysDefer,
    );
}

export function buildSubCommand<T extends SubCommand>(
    builder:
        | SlashCommandBuilder
        | ((builder: SlashCommandBuilder) => SlashCommandBuilder),
    commands: object,
) {
    const command =
        typeof builder === "function"
            ? builder(new SlashCommandBuilder())
            : builder;
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

export function buildCommand<
    O extends
        | XOR<SlashCommand, SubCommand>
        | XOR<UserContextMenuCommand, MessageContextMenuCommand>,
>(options: O): O {
    return options;
}
