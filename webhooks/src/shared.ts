import { REST } from "@discordjs/rest";
import { Routes, type APIWebhook } from "discord-api-types/v10";
import { Redis } from "ioredis";
import { log } from ".";
import { name, version } from "../package.json";
import { MemoryCache } from "./webhooks/cache/memory";
import { RedisCache } from "./webhooks/cache/redis";

export const caching = {
    type: "memory" as "redis" | "memory",
    setType: (type: "redis" | "memory", redis?: Redis) => {
        if (type === "redis") {
            if (!redis) {
                throw new Error(`You provided the 'redis' type but no redis `);
            }
            caching.type = "redis";
            caching.handler = new RedisCache(redis);
            return caching;
        }
        caching.handler = new MemoryCache();
        caching.type = type;
        return caching;
    },
    handler: new MemoryCache() as RedisCache | MemoryCache,
}
export let buttonIds: Function | null = null;
export let debugLogging: boolean = false;
export let disabledLogging: string[] = [];
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
            await caching.handler.set(id, { id: res.id, token: res.token }, "webhooks");
            return res;
        }
        return null;
    } catch (err: unknown) {
        log(`[WEBHOOK:CREATE:ERROR]: `, err);
        return null;
    }
}

export function getComponents(components: any[] | unknown, shouldTransform = true) {
    if (!Array.isArray(components)) {
        return;
    }
    if (!components.length) {
        return;
    }
    if (components.length >= 2 && buttonIds && shouldTransform) {
        let list = components.flatMap((c: any) => c.components);
        // @ts-ignore
        components = buttonIds([ ...new Set(list.filter(c => [ 2, "Button" ].includes(c.type)).map(c => (c.custom_id || c.data?.customId || c.customId || "").split(":")[1])) ].map(c => ({ id: c })), true);
    }
    return components as unknown[];
}

export function _debug(...args: unknown[]) {
    if (!debugLogging) {
        return;
    } 
    console.log(`[${new Date().toLocaleString()}]: [${name}:${version}:DEBUGGER]: `, ...args);
}

export const setup = {
    debug: (toggle: boolean) => {
        debugLogging = toggle;
    },
    buttonIds: (func: () => unknown) => {
        buttonIds = func;
    },
    ignoreGuildId: (id: string) => {
        if (disabledLogging.includes(id)) {
            disabledLogging = disabledLogging.filter(c => c !== id);
            return `Removed (${id}) from the 'disabledLogging' array.`;
        }
        disabledLogging.push(id);
        return `Added (${id}) to the 'disabledLogging' array.`;
    }
}