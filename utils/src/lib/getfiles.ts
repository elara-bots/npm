import { Collection } from "@discordjs/collection";

export type getFilesType = Collection<string, unknown>;

export function getFilesList(files: object): getFilesType {
    const map: getFilesType = new Collection();
    const allFiles = Object.entries(files);
    for (const [ name, obj ] of allFiles) {
        map.set(name, obj);
    }
    return map;
}