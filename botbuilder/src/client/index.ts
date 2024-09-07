import { is } from "@elara-services/utils";
import { ActivityType, Client, PresenceData } from "discord.js";

export function setPresence(client: Client<true>, options?: PresenceOptions) {
    client.user.setPresence(getPresence(options));
}

export interface PresenceOptions {
    status?: PresenceData["status"];
    type?: keyof typeof ActivityType;
    name?: string;
    stream_url?: string;
}

export function getPresence(options?: PresenceOptions) {
    const obj: PresenceData = {
        status: "online",
        activities: [
            {
                type: ActivityType.Watching,
                name: "commands",
            },
        ],
    };
    if (is.object(options)) {
        if (is.string(options.status)) {
            obj.status = options.status;
        }
        if (is.string(options.type)) {
            // @ts-ignore
            obj.activities[0].type = ActivityType[options.type];
        }
        if (is.string(options.stream_url)) {
            // @ts-ignore
            obj.activities[0].url = options.stream_url;
        }
        if (is.string(options.name)) {
            // @ts-ignore
            obj.activities[0].name = options.name;
        }
    }

    return obj;
}
