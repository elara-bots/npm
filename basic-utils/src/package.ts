export const packages = {
    cache: new Set<string>(),
};

/**
 * This will run the function once whenever you use the emitPackageMessage function.
 */
export function emitPackageMessage(
    name: string,
    message: (...args: unknown[]) => Promise<unknown> | unknown = () => {}
) {
    if (packages.cache.has(name)) {
        return false;
    }
    packages.cache.add(name);
    message();
    return true;
}

export function getPackageStart(pack: { name?: string; version?: string }) {
    return `[${pack.name}, v${pack.version}]`;
}
