import { Collection, XOR, is, log } from "@elara-services/utils";
import { REST, Routes, type APIUser } from "discord.js";
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
    const body: any[] = [];
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
                body.push(clone);
            }
        }
        // @ts-ignore
        body.push(cmd.command.toJSON());
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
        const clientId = (await rest.get(`/users/@me`)) as APIUser;

        // The put method is used to fully refresh all commands in the guild with the current set
        log("Deploying for production...");
        await rest.put(Routes.applicationCommands(clientId.id), { body });

        log(`Successfully reloaded application (/) commands.`);
    } catch (error) {
        // And of course, make sure you catch and log any errors!
        log(error);
    }
}
