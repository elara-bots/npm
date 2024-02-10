import { CachedOptions, Settings } from "../interfaces";

export const caches = {
    settings: new Map<string, CachedOptions<Settings>>(),
};
