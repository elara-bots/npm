import { Collection } from "@discordjs/collection";

export type getFilesType<T> = Collection<string, T>;

export function getFilesList<T>(files: object): getFilesType<T> {
    const map: getFilesType<T> = new Collection();
    const allFiles = Object.entries(files);
    for (const [name, obj] of allFiles) {
        map.set(name, obj);
    }
    return map;
}
