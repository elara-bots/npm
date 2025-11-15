export class MemoryCache {
    #caches: Record<string, Map<string, unknown>> = {};
    public debug: boolean = false;

    public async has<T extends string>(
        name: string,
        type: T
    ): Promise<boolean> {
        if (!this.#caches[type]) {
            this.#caches[type] = new Map();
        }
        return this.#caches[type]?.has(name);
    }

    public async get<D extends unknown, T extends string>(
        name: string,
        type: T
    ): Promise<D | null> {
        if (!this.#caches[type]) {
            this.#caches[type] = new Map();
        }
        return (this.#caches[type]?.get(name) || null) as D;
    }

    public async set<D extends unknown, T extends string>(
        name: string,
        data: D,
        type: T,
        ttl = 0
    ) {
        if (!this.#caches[type]) {
            this.#caches[type] = new Map();
        }
        return this.#caches[type]?.set(name, data as D);
    }

    public async remove<T extends string>(name: string, type: T) {
        if (!this.#caches[type]) {
            this.#caches[type] = new Map();
        }
        return this.#caches[type]?.delete(name);
    }
}
