import { fetch } from "@elara-services/fetch";
import { Octokit } from "@octokit/rest";
import { name, version } from "../package.json";
import { FileCreateOptions } from "./types";
import { createURL } from "./utils";

export class Files {
    public constructor(private client: Octokit) {}

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
        const c = await this.client.repos
            .createOrUpdateFileContents({
                owner: options.repo.owner,
                repo: options.repo.repo,
                message:
                    options.message || `Upload file(s) via ${name}@${version}`,
                path: options.path,
                content: data,
                branch: options.repo.branch,
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
