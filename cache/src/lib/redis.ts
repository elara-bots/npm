import { Redis } from "ioredis";
import { name, version } from "../../package.json";

export class RedisCache {
    public constructor(private redis: Redis, public debug: boolean = false) {}

    #log(...args: unknown[]) {
        if (!this.debug) {
            return null;
        }
        console.log(`[${name}, v${version}]: [DEBUG]: `, ...args);
        return null;
    }

    public async has<T extends string>(
        name: string,
        type: T
    ): Promise<boolean> {
        return (await this.redis.get(`${type}_${name}`).catch(this.#log))
            ? true
            : false;
    }

    public async get<D extends unknown, T extends string>(
        name: string,
        type: T,
        json: boolean = true
    ): Promise<D | null> {
        const data = await this.redis.get(`${type}_${name}`).catch(this.#log);
        if (!data) {
            return null;
        }
        if (json) {
            try {
                return JSON.parse(data) as D;
            } catch (err) {
                this.#log(err);
            }
        }
        return data as D;
    }

    public async set<D extends unknown, T extends string>(
        name: string,
        data: D,
        type: T,
        ttl = 3_600_000 // default: 1 hour
    ) {
        if (ttl <= 0) {
            return await this.redis
                .set(`${type}_${name}`, JSON.stringify(data))
                .catch(this.#log);
        }
        return await this.redis
            .set(`${type}_${name}`, JSON.stringify(data), "PX", ttl)
            .catch(this.#log);
    }

    public async remove<T extends string>(name: string, type: T) {
        return await this.redis.del(`${type}_${name}`).catch(this.#log);
    }
}
