import { Redis } from "ioredis";
import { XOR } from "ts-xor";

export interface BaseOptions {
    type: "memory" | "redis";
}

export interface RedisOptions extends BaseOptions {
    type: "redis";
    redis?: Redis;
}

export interface MemoryOptions extends BaseOptions {
    type: "memory";
}

export type CacheOptions = XOR<RedisOptions, MemoryOptions>;
