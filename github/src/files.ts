import { fetch } from "@elara-services/fetch";
import { Octokit } from "@octokit/rest";
import { name, version } from "../package.json";
import {
    FileCreateOptions,
    FilesGetOptions,
    FilesRemoveOptions,
} from "./types";
import { createURL, makeErr } from "./utils";

export class Files {
    public constructor(private client: Octokit) {}

    public async get(options: FilesGetOptions) {
        if (!options.path) {
            throw new Error(`No 'path' provided in options`);
        }
        const c = await this.client.repos
            .getContent({
                ...options.repo,
                ref: options.ref,
                path: options.path,
            })
            .catch(makeErr);
        if (c instanceof Error) {
            if (c.message.includes("Not Found")) {
                throw new Error(
                    `Path (${options.path}) not found in ${options.repo.owner}/${options.repo.repo}`
                );
            }
            throw c;
        }
        return c;
    }

    public async remove(options: FilesRemoveOptions) {
        if (!options.path) {
            throw new Error(`No 'path' provided in options`);
        }
        let sha = options.sha;
        if (!sha) {
            const rr = await this.get({
                path: options.path,
                repo: options.repo,
                ref: options.ref,
            });
            if (rr instanceof Error) {
                throw new Error(
                    `No 'sha' provided in options and couldn't fetch it.`
                );
            }
            // @ts-ignore
            if (rr.data?.sha) {
                // @ts-ignore
                sha = rr.data.sha;
            }
        }
        if (!sha) {
            throw new Error(`No 'sha' provided in options`);
        }
        const r = await this.client.repos
            .deleteFile({
                message:
                    options.message || `Removed via ${name}@${version} package`,
                ...options.repo,
                path: options.path,
                sha,
            })
            .catch(makeErr);
        if (r instanceof Error) {
            throw r;
        }
        return r;
    }

    public async create(options: FileCreateOptions) {
        let data: string | null = null;
        if (options.url) {
            data = await this.getData(options.url);
        } else if (options.data) {
            data = options.data;
        }
        if (!data) {
            throw new Error(
                `Unable to get any data from the provided url/data you provided for the file.`
            );
        }
        if (!options.sha) {
            const exists = await this.get({
                repo: options.repo,
                path: options.path,
            }).catch(makeErr);
            if (exists && "sha" in exists && exists.sha) {
                options.sha = exists.sha as string;
            }
        }
        const c = await this.client.repos
            .createOrUpdateFileContents({
                ...options.repo,
                message:
                    options.message || `Upload file(s) via ${name}@${version}`,
                path: options.path,
                content: data,
                sha: options.sha,
            })
            .catch((e) => new Error(e));
        const url = createURL(options.repo, encodeURIComponent(options.path));
        if (c instanceof Error) {
            if (c.message.includes(`"sha" wasn't supplied`)) {
                throw new Error(`File (${url}) already exists!`);
            }
            throw c;
        }
        return url;
    }

    public async getData(url: string) {
        const r = await fetch(url)
            .send()
            .catch(() => null);
        if (!r || r.statusCode !== 200) {
            return null;
        }
        return r.body.toString("base64");
    }
}
