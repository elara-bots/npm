import type { Collection } from "@elara-services/utils";
import { GatewayDispatchEvents as GWEvents, type Client } from "discord.js";
import type { Event, WSEvent } from "./interfaces";

export async function loadEvents(
    client: Client,
    events: Collection<string, Event | WSEvent>
) {
    for (const event of events.values()) {
        if (!event.enabled) {
            continue;
        }
        event.client = client;
        const emitter = event.emit || "on";
        const run = (...args: unknown[]) => void event.execute(...args);
        if (event.emitter === "ws") {
            const name = GWEvents[event.name as keyof typeof GWEvents];
            client.ws[emitter](name, run);
        } else {
            client[emitter](event.name, run);
        }
    }
}
