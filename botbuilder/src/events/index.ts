import { is } from "@elara-services/utils";
import { Event } from "./interfaces";

export * from "./interfaces";
export * from "./loader";

export function createEvent(
    options: Omit<Event, "enabled"> & { enabled?: boolean },
): Event {
    return {
        enabled: is.boolean(options.enabled) ? options.enabled : true,
        name: options.name,
        execute: options.execute,
        emit: options.emit,
        emitter: options.emitter,
        client: options.client,
    };
}
