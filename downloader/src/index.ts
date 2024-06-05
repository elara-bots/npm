import { http, https } from "follow-redirects";
import { createWriteStream, existsSync, mkdir, mkdirSync } from "fs";
import { basename, extname, isAbsolute, join, resolve } from "path";
import { Options } from "./interfaces";
export type * from "./interfaces";

export class Downloader {

    #defaultDirectory?: string | null;

    public constructor(defaultDirectory?: string) {
        if (defaultDirectory) {
            this.setDefaultDirectory(defaultDirectory);
        }
    }

    #sleep(ms: number) {
        return new Promise((r) => setTimeout(r, ms));
    }

    public setDefaultDirectory(path: string | null) {
        if (path) {
            if (!existsSync(path)) {
                mkdirSync(path);
            }
        }
        this.#defaultDirectory = path;
        return this;
    }

    public async file(url: string, options?: Options) {
        let dir = (options?.path || this.#defaultDirectory) as string;
        if (!dir || typeof dir !== "string") {
            throw new Error(`You didn't provide a 'path' or a defaultDirectory`);
        }

        return new Promise(async (r, rej) => {
            const extractFilename = typeof options?.extractFilename === 'boolean' ? options.extractFilename : true;
            if (!url) {
                return rej(`You didn't provide a 'url' to request.`);
            }
            if (extractFilename) {
                if (!extname(dir)) {
                    const uri = new URL(url);
                    dir = join(dir as string, decodeURIComponent(basename(uri.pathname)));
                }
            }
            if (!isAbsolute(dir)) {
                dir = resolve(__dirname, dir);
            }
            const beforeDir = dir.replace(new RegExp(`\\${basename(dir)}`, "gi"), "");
            if (existsSync(beforeDir)) {
                const rr = await this.fetch(url, dir, options).catch((e) => new Error(e));
                if (rr instanceof Error) {
                    return rej(rr.message);
                }
                return r(rr);
            }
            return mkdir(
                beforeDir,
                { recursive: true },
                async (err) => {
                    if (err) {
                        return rej(err);
                    }
                    await this.#sleep(2_000); // Why is this needed? because for some reason it doesn't create the folder fast enough 💀
                    const rr = await this.fetch(url, dir, options).catch((e) => new Error(e));
                    if (rr instanceof Error) {
                        return rej(rr.message);
                    }
                    return r(rr);
                });
        });
    }

    public async files(options: (Options & { url: string })[]) {
        const data = {
            success: [] as string[],
            errors: [] as Error[],
        };
        for await (const o of options) {
            const r = await this.file(o.url, o).catch((e) => e);
            if (r instanceof Error) {
                data.errors.push(r);
            } else {
                data.success.push((r as { filename: string })?.filename || o.url);
            }
        }
        return data;
    }

    public async fetch(url: string, path: string, options?: Options): Promise<{ filename: string }> {
        return new Promise((r, rej) => {
            const client = url.match(/https:\/\//gi) ? https : http;
            return client
                .get(url, options, (res) => {
                    if (res.statusCode !== 200) {
                        res.resume();
                        return rej(new Error(`Request Failed\nStatus Code: ${res.statusCode}`));
                    }
                    if (options && options.name) {
                        path = path.replace(basename(path), `${options.name}${extname(path)}`);
                    }
                    if (existsSync(path)) {
                        return rej(new Error(`File (${path}) already exists!`));
                    }
                    return res
                        .pipe(createWriteStream(path), { end: true })
                        .on('error', rej)
                        .once('close', () => r({ filename: path }))
                })
                .on("error", rej)
        })
    }
}