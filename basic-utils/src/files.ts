import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, Stats, statSync, writeFileSync } from "fs";
import { basename, resolve } from "path";
import { make } from "./discord";
import { is } from "./is";
import { status } from "./status";
import { log } from "./times";

export type FilesDirectoryGetOptions = Partial<{
    recursive: boolean,
    fullPath: boolean,
    ignore: string[],
    filter: (c: string, fullPath: string, stats?: Stats) => boolean,
}>

export type StatusFailed = { status: false, message: string }; 

export type FilesGetResponse<T> = {
    status: true,
    path: string;
    file: Buffer;
    json: T | null;
    stats: () => Stats;
    read: () => string;
}

export type FilesEditResponse<T> = {
    file: Buffer,
    json: T | null;
};

function extractFoldersFromPath(path: string) {
    const name = basename(path);
    const split = path.split(`\\${name}`);
    return resolve(split[0]);
}

export const files = {

    path: (path: string, ...extra: string[]) => {
        let main = resolve(path);
        if (is.array(extra)) {
            main = resolve(main, ...extra);
        }
        return main;
    },

    create: async (path: string, name: string, data: object | string | Buffer) => {
        await files.dir.create(extractFoldersFromPath(files.path(path, name)));
        try {
            if (is.object(data) && !name.endsWith(".json")) {
                throw new Error(`The 'name' provided doesn't end with .json and you provided an object for 'data'`);
            }
            await writeFileSync(resolve(path, name), is.object(data) ? JSON.stringify(data, undefined, 2) : data);
            const f = readFileSync(resolve(path, name));
            return f.toString();
        } catch (err) {
            log(`[FS:CREATE:ERROR]: `, err);
        }
        return null;
    },

    has: (path: string) => existsSync(path),
    
    get: <T>(path: string, json = false) => {
        if (!files.has(path)) {
            return status.error(`Path (${path}) doesn't exist!`);
        }
        const data = readFileSync(path);
        const res = make.object<FilesGetResponse<T>>({
            status: true,
            path,
            file: data,
            json: null,
            stats: () => statSync(path),
            read: () => data.toString(),
        });

        if (json) {
            try {
                res.json = JSON.parse(data.toString()) as T;
            } catch (err) {
                // @ts-ignore
                return status.error(new Error(err || "Unknown error while trying to parse the file to JSON").message);
            }
        }
        return res;
    },

    /**
     * returns with the updated file's info (similar to 'files.get()')
     */
    edit: async <T>(path: string, data: object | string | Buffer, isJSON = false, showBefore = true) => {
        const name = basename(path);
        const p = path.split(`\\${name}`)?.[0] || path;
        if (!files.has(p)) {
            return status.error(`Path (${p}) not found.`);
        }
        let before: FilesEditResponse<T> | null = null;
        if (showBefore) {
            const b = files.get<T>(path, isJSON);
            if (!b || !b.status) {
                return status.error(b?.message || "Unable to fetch the before file data.");
            } else {
                before = b;
            }
        }

        const r = await files.create(p, name, is.object(data) ? JSON.stringify(data, undefined, 2) : data);
        if (!r) {
            return status.error(`Unable to edit (${path})`);
        }

        const after = files.get<T>(path, isJSON) as FilesEditResponse<T>;
        for (const n of ["status", "stats", "read", "path"]) {
            // @ts-ignore
            delete before[n];
            // @ts-ignore
            delete after[n];
        }
        return { status: true, path, before, after };
    },

    dir: {
        create: async (path: string) => {
            if (!existsSync(path)) {
                try {
                    await mkdirSync(path, { recursive: true });
                } catch (err) {
                    log(`[FS:DIR:CREATE:ERROR]: `, err);
                }
            }
            return path;
        },

        get: async (path: string, options: FilesDirectoryGetOptions = {}) => {
            if (!files.has(path)) {
                return status.error(`Path (${path}) doesn't exist!`);
            }
            if (is.undefined(options.recursive)) {
                options.recursive = true;
            }
            if (is.undefined(options.fullPath)) {
                options.fullPath = true;
            }
            const dir = readdirSync(path, { recursive: options.recursive }).map((c) => c.toString());
            if (is.array(options.ignore)) {
                const beforeFilter = options.filter;
                options.filter = (c, path, stats) => {
                    for (const i of (options.ignore || [])) {
                        if (path.match(new RegExp(i, "gi"))) {
                            return false;
                        }
                    }
                    return beforeFilter ? beforeFilter(c, path, stats) : true;
                };
            }
            const arr = (options.filter ? dir.filter((c) => options.filter?.(c, resolve(path, c), statSync(resolve(path, c), { throwIfNoEntry: false }))) : dir).map((c) => options.fullPath ? resolve(path, c) : c);
            return {
                status: true as const,
                path,
                count: arr.length,
                files: arr,
            };
        },

        remove: async (path: string, recursive = false) => {
            try {
                await rmSync(path, { recursive, force: true });
                return status.success(`Removed ${path}`);
            } catch (err) {
                return status.error(new Error(err as any).message || `Unknown error while trying to remove ${path}`);
            }
        },

        temp: (tempPath: string) => {
            return {
                /**
                 * The 'path' is what you want the file to be called when it gets created. (i.e: "test/file.js" or "images/12345.png")
                 */
                add: async (path: string, data: object | string | Buffer) => await files.create(tempPath, path, data),
                remove: async (...path: string[]) => await files.dir.remove(files.path(tempPath, ...path), false),
                /**
                 * The 'ms' above what the file should be stored temp as. 
                 * The 'ignore' array is an array of strings to ignore if the file has it in the path.
                 */
                expired: async (options: {
                    ms: number,
                    ignore?: string[],
                    remove?: boolean,
                }) => {
                    if (!is.number(options.ms)) {
                        return status.error(`Invalid 'options.ms' provided.`);
                    }
                    await files.dir.create(tempPath);
                    const r = await files.dir.get(tempPath, {
                        fullPath: true,
                        ignore: [
                            ...(options.ignore || []),
                            ".gitkeep"
                        ],
                        recursive: true,
                        filter: (_, __, stats) =>  stats ? stats.isDirectory() ? false : (Date.now() - stats.mtime.getTime()) >= options.ms ? true : false : false,
                    }) ;
                    if (!r.status || !is.array(r.files)) {
                        // @ts-ignore
                        return status.error(r.message || "No files found in the temp path.");
                    }
                    if (options.remove === true) {
                        await Promise.all(r.files.map((c) => files.dir.remove(c, false)));
                    }
                    return r;
                },
            };
        }
    }
};