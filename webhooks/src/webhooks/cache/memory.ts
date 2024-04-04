import { XOR, get } from "@elara-services/utils";
import { CachedChannel, CachedOptionType, CachedWebhook } from "../../interfaces";

export class MemoryCache {
    public channels = new Map<string, CachedChannel>();
    public webhooks = new Map<string, CachedWebhook>();
    public constructor() {}

    public async has(name: string, type: CachedOptionType = "webhooks"): Promise<boolean> {
        return this[type].has(name);
    }

    public async get<D extends XOR<CachedChannel, CachedWebhook>>(name: string, type: CachedOptionType = "webhooks"): Promise<D | null> {
        return (this[type].get(name) || null) as D;
    }

    public async set(name: string, data: CachedChannel | CachedWebhook, type: CachedOptionType = "webhooks", ttl = get.hrs(1)) {
        switch (type) {
            case "webhooks": {
                return this.webhooks.set(name, data as CachedWebhook);
            };
            case "channels": {
                return this.channels.set(name, data as CachedChannel);
            }
            default: {
                throw new Error(`Unsupported (${type}) provided.`);
            }
        }
    }

    public async remove(name: string, type: CachedOptionType = "webhooks") {
        return this[type].delete(name);
    }
}