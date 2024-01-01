import { Collection, GuildMember, Interaction, Message } from "discord.js";
import { PrefixCommand, SlashCommand } from "./interfaces";
import {
    commands,
    getInteractionResponder,
    getMessageResponder,
    is,
} from "@elara-services/utils";

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
            if (!message.member.roles.cache.hasAll(...cmd.locked.roles)) {
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
            if (message.member.roles.cache.hasAll(...cmd.disabled.roles)) {
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

    return cmd.execute(message, getMessageResponder(message));
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
    if (!cmd) {
        return;
    }
    if (cmd.enabled === false) {
        return;
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
            return;
        }
        if (cmd.only.text && !i.channel?.isTextBased()) {
            return;
        }
        if (cmd.only.dms && i.guild) {
            return;
        }
        if (cmd.only.threads && !i.channel?.isThread()) {
            return;
        }
        if (cmd.only.voice && !i.channel?.isVoiceBased()) {
            return;
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
            return;
        }
        if (is.array(cmd.locked.roles)) {
            if (!(i.member instanceof GuildMember)) {
                return;
            }
            if (!i.member.roles.cache.hasAll(...cmd.locked.roles)) {
                return;
            }
        }
        if (
            is.array(cmd.locked.users) &&
            !cmd.locked.users.includes(i.user.id)
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
            if (!(i.member instanceof GuildMember)) {
                return;
            }
            if (i.member.roles.cache.hasAll(...cmd.disabled.roles)) {
                return;
            }
        }
        if (
            is.array(cmd.disabled.users) &&
            cmd.disabled.users.includes(i.user.id)
        ) {
            return;
        }
    }
    // @ts-ignore
    return cmd.execute(i, getInteractionResponder(i));
}
