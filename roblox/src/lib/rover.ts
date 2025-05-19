import { createService } from "../utils";

export const rover = (key?: string) => createService({
    name: "rover",
    priority: 3,
    handler: {
        required: ["api_key", "guild_id"],
        api: {
            endpoint: `https://registry.rover.link/api/guilds/%GUILD_ID%/discord-to-roblox/%DISCORD_ID%`,
            fieldName: "robloxId",
            headers: {
                "Authorization": `Bearer ${key}`,
            },
            verifyPage: `https://rover.link`
        }
    }
})