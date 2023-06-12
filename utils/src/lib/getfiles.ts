export type getFilesType = Map<string, unknown>;

export function getFilesList(files: object): getFilesType {
    const map: getFilesType = new Map();
    const allFiles = Object.entries(files);
    for (const [ name, obj ] of allFiles) {
        map.set(name, obj);
    }
    return map;
}