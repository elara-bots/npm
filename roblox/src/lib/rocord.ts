import { createService } from "../utils";

export const rocord = () => createService({
    name: "rocord",
    priority: 1,
    handler: {
        api: {
            endpoint: `https://rocord.elara.workers.dev/users/%DISCORD_ID%`,
            fieldName: "id",
            verifyPage: `https://rocord.superchiefyt.xyz`
        }
    }
})