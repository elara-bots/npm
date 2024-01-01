import type { Collection } from "@elara-services/utils";
import {
    REST,
    Routes,
    type APIUser,
    type RESTPostAPIChatInputApplicationCommandsJSONBody,
} from "discord.js";
import type { SlashCommand } from ".";

export async function deployCommands<T extends SlashCommand>(
    botToken: string,
    commands: Collection<string, T>,
) {
    const body: RESTPostAPIChatInputApplicationCommandsJSONBody[] = [];
    for (const cmd of commands.values()) {
        if (
            !("command" in cmd) ||
            !("toJSON" in cmd.command) ||
            !("execute" in cmd)
        ) {
            continue;
        }
        // @ts-ignore
        body.push(cmd.command.toJSON());
    }
    try {
        const rest = new REST({ version: "10" }).setToken(botToken);
        console.log(`Started refreshing application (/) commands.`);
        const clientId = (await rest.get(`/users/@me`)) as APIUser;

        // The put method is used to fully refresh all commands in the guild with the current set
        console.log("Deploying for production...");
        await rest.put(Routes.applicationCommands(clientId.id), { body });

        console.log(`Successfully reloaded application (/) commands.`);
    } catch (error) {
        // And of course, make sure you catch and log any errors!
        console.error(error);
    }
}
