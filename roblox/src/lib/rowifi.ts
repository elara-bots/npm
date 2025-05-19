import { createService } from "../utils";

export const rowifi = (key?: string) => createService({
    name: "rowifi",
    priority: 4,
    handler: {
        required: ["api_key", "guild_id"],
        api: {
            endpoint: `https://api.rowifi.xyz/v3/guilds/%GUILD_ID%/members/%DISCORD_ID%`,
            fieldName: "roblox_id",
            headers: {
                "Authorization": `Bot ${key}`,
            },
            verifyPage: `https://rowifi.xyz`
        }
    }
})