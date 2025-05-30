import {
    colors,
    commands,
    embedComment,
    getFilesList,
    getInteractionResponder,
    getMessageResponder,
    is,
    log,
    make,
    noop,
    XOR,
} from "@elara-services/utils";
import {
    APIApplicationCommandOptionChoice,
    ChatInputCommandInteraction,
    Collection,
    GuildMember,
    Interaction,
    InteractionEditReplyOptions,
    Message,
    SlashCommandBooleanOption,
    SlashCommandBuilder,
    SlashCommandIntegerOption,
    SlashCommandRoleOption,
    SlashCommandStringOption,
    SlashCommandUserOption,
} from "discord.js";
import {
    Defer,
    MessageContextMenuCommand,
    Pre,
    PrefixCommand,
    SlashCommand,
    SubCommand,
    UserContextMenuCommand,
} from "./interfaces";
import { m } from "./messages";

export * from "./components";
export * from "./context";
export * from "./deploy";
export * from "./interfaces";
export * from "./pager";
export * from "./utils";
export * from "./process";

export async function handleMessageCommand<
    M extends Message,
    C extends PrefixCommand,
>(
    message: M,
    cmds: Collection<string, C>,
    prefix: string,
    pre?: (message: M, cmd: C) => Pre,
    options?: Partial<{
        /**
         * Makes the bot respond with an error message if there is one (by default this is disabled!)
         */
        replyWith: boolean;
        /**
         * Allows prefix commands to be used by other bots (by default this is disabled!)
         * */
        allowBots: boolean;
    }>,
) {
    if (!message.content) {
        return;
    }
    if (message.author.bot) {
        const allowBots = options?.allowBots ?? false;
        if (allowBots !== true) {
            return;
        }
    }

    const data = commands(message.content, prefix);
    if (!data.hasPrefix() || !data.name) {
        return;
    }
    const cmd = cmds.find(
        (c) =>
            c.name.toLowerCase() === data.name.toLowerCase() ||
            c.aliases?.some((a) => a.toLowerCase() === data.name.toLowerCase()),
    );
    const reply = async (str: string) => {
        if (options?.replyWith !== true) {
            return;
        }
        await message.reply(embedComment(str, colors.red)).catch(noop);
        return;
    };
    if (!cmd) {
        return;
    }
    if (cmd.enabled === false) {
        return;
    }
    if (pre) {
        const p = await pre(message, cmd);
        if (is.boolean(p)) {
            if (!p) {
                return;
            }
        }
        if (is.object(p) && !p.status) {
            return reply(p.message);
        }
    }
    if (cmd.pre) {
        const p = await cmd.pre(message, cmd);
        if (is.boolean(p)) {
            if (!p) {
                return;
            }
        }
        if (is.object(p) && !p.status) {
            return reply(p.message);
        }
    }
    if (is.object(cmd.only)) {
        const isText = (): boolean =>
            "isText" in message.channel
                ? // @ts-ignore
                  message.channel.isText()
                : "isTextBased" in message.channel
                ? message.channel.isTextBased()
                : false;
        if (is.boolean(cmd.only.guild)) {
            if (cmd.only.guild === true && !message.guild) {
                return reply(m.only.guild);
            }
            if (cmd.only.guild === false && message.guild) {
                return reply(m.not.guild);
            }
        }
        if (is.boolean(cmd.only.text)) {
            if (cmd.only.text === true && !isText()) {
                return reply(m.only.text);
            }
            if (cmd.only.text === false && isText()) {
                return reply(m.not.text);
            }
        }
        if (is.boolean(cmd.only.dms)) {
            if (cmd.only.dms === true && message.guild) {
                return reply(m.only.dms);
            }
            if (cmd.only.dms === false && !message.guild) {
                return reply(m.not.dms);
            }
        }

        if (is.boolean(cmd.only.threads)) {
            if (cmd.only.threads === true && !message.channel.isThread()) {
                return reply(m.only.threads);
            }
            if (cmd.only.threads === false && message.channel.isThread()) {
                return reply(m.not.threads);
            }
        }

        if (is.boolean(cmd.only.voice)) {
            if (cmd.only.voice === true && !message.channel.isVoiceBased()) {
                return reply(m.only.voice);
            }
            if (cmd.only.voice === false && message.channel.isVoiceBased()) {
                return reply(m.not.voice);
            }
        }
    }
    const cs = make.array<string>([message.channelId]);
    if ("parentId" in message.channel && message.channel.parentId) {
        cs.push(message.channel.parentId);
    }
    if (is.object(cmd.locked)) {
        if (
            is.array(cmd.locked.channels) &&
            !cmd.locked.channels.some((c) => cs.includes(c))
        ) {
            return reply(m.locked.channels);
        }
        if (is.array(cmd.locked.roles)) {
            if (!message.member) {
                return reply(m.locked.roles);
            }
            if (!message.member.roles.cache.hasAny(...cmd.locked.roles)) {
                return reply(m.locked.roles);
            }
        }
        if (
            is.array(cmd.locked.users) &&
            !cmd.locked.users.includes(message.author.id)
        ) {
            return reply(m.locked.users);
        }
    }
    if (is.object(cmd.disabled)) {
        if (
            is.array(cmd.disabled.channels) &&
            cmd.disabled.channels.some((c) => cs.includes(c))
        ) {
            return reply(m.disabled.channels);
        }
        if (is.array(cmd.disabled.roles)) {
            if (!message.member) {
                return reply(m.disabled.roles);
            }
            if (message.member.roles.cache.hasAny(...cmd.disabled.roles)) {
                return reply(m.disabled.roles);
            }
        }
        if (
            is.array(cmd.disabled.users) &&
            cmd.disabled.users.includes(message.author.id)
        ) {
            return reply(m.disabled.users);
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
    pre?: (i: I, cmd: C) => Pre,
    alwaysDefer?: Defer<I>,
) {
    if (!i.isRepliable()) {
        return;
    }
    if (!("commandName" in i)) {
        return;
    }
    const cmd = cmds.find(
        (c) =>
            c?.command?.name === i.commandName ||
            c?.aliases?.includes(i.commandName),
    );
    return handleCommands(i, cmd, pre, alwaysDefer);
}

export async function handleAutocompleteCommand(
    i: Interaction,
    cmds: Collection<string, SlashCommand>,
) {
    if (!i.isAutocomplete() || !i.channel) {
        return;
    }
    const cmd = cmds.find(
        (c) =>
            c?.command?.name === i.commandName ||
            c.aliases?.includes(i.commandName),
    );
    if (!cmd || cmd.enabled === false) {
        return;
    }
    if (!cmd.autocomplete || !("autocomplete" in cmd)) {
        // If there is no autocomplete function then it will not respond at all.
        return;
    }
    if (is.object(cmd.only)) {
        if (is.boolean(cmd.only.guild)) {
            if (cmd.only.guild === true && !i.guild) {
                return;
            }
            if (cmd.only.guild == false && i.guild) {
                return;
            }
        }
        if (is.boolean(cmd.only.text)) {
            if (cmd.only.text === true && !i.channel.isTextBased()) {
                return;
            }
            if (cmd.only.text === false && i.channel.isTextBased()) {
                return;
            }
        }

        if (is.boolean(cmd.only.dms)) {
            if (cmd.only.dms === true && i.guild) {
                return;
            }
            if (cmd.only.dms === false && !i.guild) {
                return;
            }
        }

        if (is.boolean(cmd.only.threads)) {
            if (cmd.only.threads === true && !i.channel.isThread()) {
                return;
            }
            if (cmd.only.threads === false && i.channel.isThread()) {
                return;
            }
        }

        if (is.boolean(cmd.only.voice)) {
            if (cmd.only.voice === true && !i.channel.isVoiceBased()) {
                return;
            }
            if (cmd.only.voice === false && i.channel.isVoiceBased()) {
                return;
            }
        }
    }
    const cs = make.array([i.channelId]);
    if ("parentId" in i.channel && i.channel.parentId) {
        cs.push(i.channel.parentId);
    }
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
            if (!i.member.roles.cache.hasAny(...cmd.locked.roles)) {
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
            if (i.member.roles.cache.hasAny(...cmd.disabled.roles)) {
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
    return cmd.autocomplete(i);
}

export async function handleCommands<
    I extends Interaction,
    C extends SlashCommand,
>(
    i: I,
    cmd: C | undefined,
    pre?: (i: I, cmd: C) => Pre,
    alwaysDefer?: Defer<I>,
) {
    if (!i.isRepliable() || !i.channel) {
        return;
    }
    if (!("commandName" in i)) {
        return;
    }
    const reply = async (content: string) => {
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
        return reply(m.not.found(i.commandName));
    }
    if (cmd.enabled === false) {
        return reply(m.not.enabled(i.commandName));
    }
    if (!cmd.execute || !("execute" in cmd)) {
        return reply(m.required.commands.execute(i.commandName));
    }
    if (is.object(alwaysDefer)) {
        if (alwaysDefer.filter) {
            await i
                .deferReply({ ephemeral: alwaysDefer.filter(i) })
                .catch(noop);
        } else {
            await i
                .deferReply({ ephemeral: alwaysDefer.silent || false })
                .catch(noop);
        }
    } else if (is.object(cmd.defer)) {
        if (cmd.defer.filter) {
            // @ts-ignore
            await i.deferReply({ ephemeral: cmd.defer.filter(i) }).catch(noop);
        } else {
            await i
                .deferReply({ ephemeral: cmd.defer.silent || false })
                .catch(noop);
        }
    }
    if (pre) {
        const p = await pre(i, cmd);
        if (is.boolean(p) && !p) {
            return;
        }
        if (is.object(p) && !p.status) {
            return reply(p.message);
        }
    }
    if (cmd.pre) {
        // @ts-ignore
        const p = await cmd.pre(i, cmd);
        if (is.boolean(p) && !p) {
            return;
        }
        if (is.object(p) && !p.status) {
            return reply(p.message);
        }
    }
    if (is.object(cmd.only, true)) {
        if (
            is.array(cmd.only.guilds) &&
            !cmd.only.guilds.includes(i.guildId || "")
        ) {
            return reply(m.only.guilds(cmd.only.guilds));
        }
        if (is.boolean(cmd.only.guild)) {
            if (cmd.only.guild === true && !i.guild) {
                return reply(m.only.guild);
            }
            if (cmd.only.guild == false && i.guild) {
                return reply(m.not.guild);
            }
        }
        if (is.boolean(cmd.only.text)) {
            if (cmd.only.text === true && !i.channel.isTextBased()) {
                return reply(m.only.text);
            }
            if (cmd.only.text === false && i.channel.isTextBased()) {
                return reply(m.not.text);
            }
        }

        if (is.boolean(cmd.only.dms)) {
            if (cmd.only.dms === true && i.guild) {
                return reply(m.only.dms);
            }
            if (cmd.only.dms === false && !i.guild) {
                return reply(m.not.dms);
            }
        }

        if (is.boolean(cmd.only.threads)) {
            if (cmd.only.threads === true && !i.channel.isThread()) {
                return reply(m.only.threads);
            }
            if (cmd.only.threads === false && i.channel.isThread()) {
                return reply(m.not.threads);
            }
        }

        if (is.boolean(cmd.only.voice)) {
            if (cmd.only.voice === true && !i.channel.isVoiceBased()) {
                return reply(m.only.voice);
            }
            if (cmd.only.voice === false && i.channel.isVoiceBased()) {
                return reply(m.not.voice);
            }
        }
    }
    const cs = make.array([i.channelId]);
    if ("parentId" in i.channel && i.channel.parentId) {
        cs.push(i.channel.parentId);
    }
    if (is.object(cmd.locked, true)) {
        if (cmd.locked.permissions && is.func(cmd.locked.permissions)) {
            if (!i.member || !(i.member instanceof GuildMember)) {
                return reply(m.not.guild);
            }
            const r = cmd.locked.permissions(i.member);
            if (!r.status) {
                return reply(r.message);
            }
        }
        if (
            is.array(cmd.locked.channels) &&
            !cmd.locked.channels.some((c) => cs.includes(c))
        ) {
            return reply(m.locked.channels);
        }
        if (is.array(cmd.locked.roles)) {
            if (!(i.member instanceof GuildMember)) {
                return reply(m.locked.roles);
            }
            if (!i.member.roles.cache.hasAny(...cmd.locked.roles)) {
                return reply(m.locked.roles);
            }
        }
        if (
            is.array(cmd.locked.users) &&
            !cmd.locked.users.includes(i.user.id)
        ) {
            return reply(m.locked.users);
        }
    }
    if (is.object(cmd.disabled)) {
        if (cmd.disabled.permissions && is.func(cmd.disabled.permissions)) {
            if (!i.member || !(i.member instanceof GuildMember)) {
                return reply(m.not.guild);
            }
            const r = cmd.disabled.permissions(i.member);
            if (!r.status) {
                return reply(r.message);
            }
        }
        if (
            is.array(cmd.disabled.channels) &&
            cmd.disabled.channels.some((c) => cs.includes(c))
        ) {
            return reply(m.disabled.channels);
        }
        if (is.array(cmd.disabled.roles)) {
            if (!(i.member instanceof GuildMember)) {
                return reply(m.disabled.roles);
            }
            if (i.member.roles.cache.hasAny(...cmd.disabled.roles)) {
                return reply(m.disabled.roles);
            }
        }
        if (
            is.array(cmd.disabled.users) &&
            cmd.disabled.users.includes(i.user.id)
        ) {
            return reply(m.disabled.users);
        }
    }
    // @ts-ignore
    return cmd.execute(i, getInteractionResponder(i));
}

export function handleSubCommands<T extends ChatInputCommandInteraction, F>(
    interaction: T,
    files: F,
    pre?: (i: Interaction, cmd: SubCommand) => Pre,
    alwaysDefer?: Defer<T>,
) {
    const name = interaction.options.getSubcommand();
    if (!(files instanceof Collection)) {
        return;
    }
    return handleCommands(interaction, files.get(name), pre, alwaysDefer);
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
    if (!is.object(options)) {
        throw new Error(`You failed to provide any options for the command.`);
    }
    if (!is.boolean(options.enabled)) {
        options.enabled = true;
    }
    return options;
}

export function buildPrefixCommand(options: PrefixCommand) {
    if (!is.object(options)) {
        throw new Error(`You failed to provide any options for the command.`);
    }
    if (!is.boolean(options.enabled)) {
        options.enabled = true;
    }
    return options;
}

export function getUser(
    o: SlashCommandUserOption,
    options?: {
        name?: string;
        description?: string;
        required?: boolean;
    },
) {
    return o
        .setName(options?.name ?? `user`)
        .setDescription(options?.description ?? `What's the user?`)
        .setRequired(
            is.object(options)
                ? is.boolean(options.required)
                    ? options.required
                    : true
                : true,
        );
}

export function getReason(
    o: SlashCommandStringOption,
    required = true,
    autocomplete = false,
) {
    return o
        .setName(`reason`)
        .setDescription(`What's the reason?`)
        .setAutocomplete(autocomplete)
        .setRequired(required);
}

export function getRole(
    o: SlashCommandRoleOption,
    options?: {
        name?: string;
        description?: string;
        required?: boolean;
    },
) {
    return o
        .setName(options?.name || "role")
        .setDescription(options?.description || "What role?")
        .setRequired(
            is.boolean(options?.required)
                ? options?.required === false
                    ? false
                    : true
                : true,
        );
}

export function getStr(
    o: SlashCommandStringOption,
    options: {
        name: string;
        description: string;
        required?: boolean;
        autocomplete?: boolean;
        min?: number;
        max?: number;
        choices?: APIApplicationCommandOptionChoice<string>[];
    },
) {
    if (is.number(options.min)) {
        o.setMinLength(options.min);
    }
    if (is.number(options.max)) {
        o.setMaxLength(options.max);
    }
    if (is.array(options.choices)) {
        o.addChoices(...options.choices);
    }
    if (is.boolean(options.autocomplete)) {
        o.setAutocomplete(options.autocomplete);
    }
    return o
        .setName(options.name)
        .setDescription(options.description)
        .setRequired(is.boolean(options.required) ? options.required : true);
}

export function getBool(
    o: SlashCommandBooleanOption,
    options: { name: string; description: string; required?: boolean },
) {
    return o
        .setName(options.name)
        .setDescription(options.description)
        .setRequired(options.required ?? false);
}

export function getInt(
    o: SlashCommandIntegerOption,
    options: {
        name: string;
        description?: string;
        required?: boolean;
        autocomplete?: boolean;
        min?: number;
        max?: number;
        choices?: SlashCommandIntegerOption["choices"];
    },
) {
    if (is.number(options.min)) {
        o.setMinValue(options.min);
    }
    if (is.number(options.max)) {
        o.setMaxValue(options.max);
    }
    if (is.array(options.choices)) {
        o.addChoices(...options.choices);
    }
    if (is.boolean(options.autocomplete)) {
        o.setAutocomplete(options.autocomplete);
    }
    return o
        .setName(options.name)
        .setDescription(options.description || "What's the amount?")
        .setRequired(options.required ?? true);
}

export function sendFile(
    name: string,
    data: object | object[],
): InteractionEditReplyOptions {
    return {
        files: [
            {
                name: `${name}.json`,
                attachment: Buffer.from(JSON.stringify(data, undefined, 2)),
            },
        ],
    };
}

export function handleInteractions(
    i: Interaction,
    commands: object,
    pre?: (i: Interaction, cmd: any) => Pre,
    alwaysDefer?: Defer<Interaction>,
) {
    return handleInteractionCommand(
        i,
        getFilesList<any>(commands),
        async (ii, cmd) => {
            if (!ii.isCommand()) {
                return false;
            }
            if (pre) {
                return await pre(ii, cmd);
            }
            return true;
        },
        alwaysDefer,
    );
}

export * from "./messages";
