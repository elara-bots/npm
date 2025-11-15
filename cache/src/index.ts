import { Redis } from "ioredis";
import { XOR } from "ts-xor";
import type { CacheOptions } from "./interfaces";
import { MemoryCache } from "./lib/memory";
import { RedisCache } from "./lib/redis";

export type * from "./interfaces";
export type * from "./lib/memory";
export type * from "./lib/redis";

export class Caching {
    public type: "memory" | "redis" = "memory";
    public handler: XOR<RedisCache, MemoryCache>;
    public constructor(options?: CacheOptions, public debug: boolean = false) {
        if (options) {
            this.type = options.type ?? "memory";
            if (options.type === "redis") {
                this.handler = new RedisCache(
                    options.redis ?? new Redis(),
                    debug
                );
            } else {
                this.handler = new MemoryCache();
            }
        } else {
            this.type = "memory";
            this.handler = new MemoryCache();
        }
    }

    public setDebug(bool: boolean) {
        this.debug = bool;
        this.handler.debug = bool;
        return this;
    }

    public setType(type: CacheOptions["type"], redis?: Redis) {
        this.type = type ?? "memory";
        if (type === "memory") {
            this.handler = new MemoryCache();
        } else if (type === "redis") {
            this.handler = new RedisCache(redis ?? new Redis());
        }
        return this;
    }
}
