import { Redis, RedisOptions } from "ioredis";

export class RedisClient {
    /**
     * @description This will prefix keys with "{prefix}_", example: client ID
     */
    public prefix: string | null = null;
    public redis: Redis;
    public constructor(options: RedisOptions = {}) {
        this.redis = new Redis(options);
    }

    /**
     * @description Set the key prefix
     */
    public setPrefix(prefix?: string | null) {
        this.prefix = prefix || null;
        return this;
    }

    /**
     * @description Get the key ID to use / get data for.
     */
    public id<D>(id: string | string[], usePrefix = true): D {
        const pre = usePrefix === true && this.prefix !== null;
        const gId = (i: string) => `${pre ? `${this.prefix}_` : ""}${i}` as D;
        return typeof id === "string" ? gId(id) : (id.map((c) => gId(c)) as D);
    }

    /**
     * @description The string will get parsed into an object.
     */
    public json<D>(data: string | null) {
        if (!data) {
            return null;
        }
        try {
            return JSON.parse(data) as D;
        } catch {
            return null;
        }
    }

    /**
     * @description Get data from the redis-server
     */
    public async rget<D>(
        id: string,
        json = true,
        usePrefix = true
    ): Promise<D | null> {
        const d = await this.redis
            .get(this.id<string>(id, usePrefix))
            .catch(() => null);
        if (!d) {
            return null;
        }
        if (json) {
            return this.json<D>(d);
        }
        return d as D;
    }

    /**
     * @description Get data for multiple keys
     */
    public async rmget<D>(
        ids: string[],
        json = true,
        usePrefix = true
    ): Promise<D[] | null> {
        const d = await this.redis
            .mget(this.id<string[]>(ids, usePrefix))
            .catch(() => []);
        if (!d.length) {
            return null;
        }
        if (json) {
            const dd = d.map((c) => this.json<D>(c)).filter((c) => c);
            if (!dd.length) {
                return null;
            }
            return dd as D[];
        }
        return d as D[];
    }

    /**
     * @description Add something to the redis-server.
     */
    public async rset(
        id: string,
        value: string | object,
        time = 600000,
        ex:
            | "EX"
            | "EXAT"
            | "GET"
            | "KEEPTTL"
            | "NX"
            | "PX"
            | "PXAT"
            | "XX"
            | false = "PX",
        usePrefix = true
    ): Promise<string | null> {
        if (!time) {
            return await this.redis
                .set(this.id<string>(id, usePrefix), JSON.stringify(value))
                .catch(() => null);
        }
        return await this.redis
            .set(
                this.id<string>(id, usePrefix),
                JSON.stringify(value),
                // @ts-ignore
                ex || "PX",
                time
            )
            .catch(() => null);
    }

    /**
     * @description Delete single or multiple keys
     */
    public async rdel(id: string | string[], usePrefix = true) {
        return await this.redis.del(this.id(id, usePrefix)).catch(() => 0);
    }

    /**
     * @description Get all keys matching a certain search.
     */
    public async rkeys(search = "*"): Promise<string[]> {
        return await this.redis.keys(search).catch(() => []);
    }

    /**
     * @description This will clear all keys & data from the redis-server.
     */
    public async rflush(): Promise<"OK" | "NO"> {
        return await this.redis.flushall().catch(() => "NO");
    }

    /**
     * @description This will return a boolean if the ID is found
     */
    public async rhas(id: string, usePrefix = true): Promise<boolean> {
        if (await this.rget(id, false, usePrefix)) {
            return true;
        }
        return false;
    }

    /**
     * @description Provides a count for all keys in redis-server or for a certain search
     */
    public async rcount(search = "*") {
        return (await this.rkeys(search)).length;
    }

    /**
     * @description Provides a map that gets all keys & data in the redis-server
     */
    public async rall<D>(search = "*", json = true): Promise<Map<string, D>> {
        const map = new Map<string, D>();
        const keys = await this.rkeys(search);
        if (!keys.length) {
            return map;
        }
        for await (const key of keys) {
            const value = await this.rget<D>(key, json, false);
            if (value) {
                map.set(key, value);
            }
        }
        return map;
    }
}
