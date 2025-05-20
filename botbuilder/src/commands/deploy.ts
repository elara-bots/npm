import {
    Collection,
    XOR,
    getClientIdFromToken,
    is,
    log,
    make,
} from "@elara-services/utils";
import { REST, Routes } from "discord.js";
import type {
    MessageContextMenuCommand,
    SlashCommand,
    UserContextMenuCommand,
} from ".";

export async function deployCommands<
    T extends SlashCommand,
    S extends XOR<UserContextMenuCommand, MessageContextMenuCommand>,
>(
    botToken: string,
    commands: Collection<string, T>,
    subCommands?: Collection<string, S>,
) {
    const clientId = getClientIdFromToken(botToken);
    const body = make.array<T>();
    const servers = make.map<string, T[]>();

    const addServer = (cmd: T) => {
        if (is.object(cmd.only, true)) {
            if (is.array(cmd.only.guilds)) {
                for (const id of cmd.only.guilds) {
                    const f = servers.get(id);
                    if (f) {
                        // @ts-ignore
                        f.push(cmd.command.toJSON());
                    } else {
                        // @ts-ignore
                        servers.set(id, [cmd.command.toJSON()]);
                    }
                }
                return false;
            }
        }
        // @ts-ignore
        return cmd.command.toJSON();
    };

    for (const cmd of commands.values()) {
        if (
            !("command" in cmd) ||
            !("toJSON" in cmd.command) ||
            !("execute" in cmd)
        ) {
            continue;
        }
        if (is.array(cmd.aliases)) {
            for (const alias of cmd.aliases) {
                // @ts-ignore
                const clone = cmd.command.toJSON();
                clone.name = alias;
                // @ts-ignore
                const d = addServer(clone);
                if (d) {
                    body.push(d);
                }
            }
        }
        const data = addServer(cmd);
        if (data) {
            body.push(data);
        }
    }
    if (subCommands && subCommands.size) {
        for (const cmd of subCommands.values()) {
            if (
                !("command" in cmd) ||
                !("toJSON" in cmd.command) ||
                !("execute" in cmd)
            ) {
                continue;
            }
            if (is.array(cmd.aliases)) {
                for (const alias of cmd.aliases) {
                    // @ts-ignore
                    const clone = cmd.command.toJSON();
                    clone.name = alias;
                    // @ts-ignore
                    body.push(clone);
                }
            }
            // @ts-ignore
            body.push(cmd.command.toJSON());
        }
    }
    try {
        const rest = new REST({ version: "10" }).setToken(botToken);
        log(`Started refreshing application (/) commands.`);
        // The put method is used to fully refresh all commands in the guild with the current set
        log("Deploying for production...");
        await rest.put(Routes.applicationCommands(clientId), { body });
        if (servers.size) {
            for (const [id, commands] of servers.entries()) {
                await rest
                    .put(Routes.applicationGuildCommands(clientId, id), {
                        body: commands,
                    })
                    .catch((e) => {
                        log(
                            `[GUILD:COMMANDS:ERROR]: For (clientId=${clientId} | guildId=${id})`,
                            e,
                        );
                    });
            }
        }
        log(`Successfully reloaded application (/) commands.`);
    } catch (error) {
        // And of course, make sure you catch and log any errors!
        log(error);
    }
}
