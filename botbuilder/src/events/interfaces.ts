import { type Client, Events, GatewayDispatchEvents } from "discord.js";

export interface Event {
    name: keyof typeof Events | string;
    enabled: boolean;
    emitter?: "client" | "ws";
    emit?: "on" | "once";
    client?: Client | null;
    execute(...args: unknown[]): Promise<unknown> | unknown;
}

export interface WSEvent extends Event {
    name: keyof typeof GatewayDispatchEvents;
}

export { Events, GatewayDispatchEvents };
