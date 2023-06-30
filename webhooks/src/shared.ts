import { Collection } from "@discordjs/collection";
import { REST } from "@discordjs/rest";
import { Routes, type APIWebhook } from "discord-api-types/v10";
import { log, type CachedChannel, type CachedWebhook } from ".";

export const webhooks: Collection<string, CachedWebhook> = new Collection();
export const channels: Collection<string, CachedChannel> = new Collection();
export const disabledLogging: string[] = [];
export const rest = new REST();

export async function createWebhook(client: REST, id: string = "", name: string) {
    if (!id) {
        return null;
    }
    try {
        const res = (await client.post(
            Routes.channelWebhooks(id),
            {
                reason: "Created for logging purposes",
                body: { name }
            }
        )) as APIWebhook;
        if (res.id && res.token) {
            webhooks.set(id, { id: res.id, token: res.token });
            return res;
        }
        return null;
    } catch (err: unknown) {
        log(`[WEBHOOK:CREATE:ERROR]: `, err);
        return null;
    }
}