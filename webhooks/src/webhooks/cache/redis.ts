import { XOR, get } from "@elara-services/utils";
import { Redis } from "ioredis";
import { CachedChannel, CachedOptionType, CachedWebhook } from "../../interfaces";

export class RedisCache {
    public constructor(public redis: Redis) {}

    public async has(name: string, type: CachedOptionType = "webhooks"): Promise<boolean> {
        return (await this.redis.get(`${type}_${name}`).catch(() => null)) ? true : false; 
    }

    public async get<D extends XOR<CachedChannel, CachedWebhook>>(name: string, type: CachedOptionType = "webhooks"): Promise<D | null> {
        const data = await this.redis.get(`${type}_${name}`).catch(() => null);
        if (!data) {
            return null;
        }
        try {
            return JSON.parse(data) as D;
        } catch {}
        return null;
    }

    public async set(name: string, data: CachedChannel | CachedWebhook, type: CachedOptionType = "webhooks", ttl = get.hrs(1)) {
        return await this.redis.set(`${type}_${name}`, JSON.stringify(data), "PX", ttl).catch(() => null);
    }

    public async remove(name: string, type: CachedOptionType = "webhooks") {
        return await this.redis.del(`${type}_${name}`).catch(() => null);
    }
}