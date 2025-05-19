import { createService } from "../utils";

export const bloxlink = (key?: string) => createService({
    name: "bloxlink",
    priority: 2,
    handler: {
        required: ["api_key"],
        api: {
            headers: {
                "Authorization": key as string,
            },
            endpoint: `https://api.blox.link/v4/public/discord-to-roblox/%DISCORD_ID%`,
            fieldName: "robloxID",
            verifyPage: `https://blox.link`
        }
    }
})