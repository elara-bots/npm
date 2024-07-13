import { Octokit } from "@octokit/rest";
import { Files } from "./files";
import { Issues } from "./issues";

export type * from "./files";
export type * from "./interfaces";

export class GitHub {
    public client: Octokit;
    public files: Files;
    public issues: Issues;
    public constructor(private token: string, debug?: boolean) {
        this.client = new Octokit({
            auth: token,
            log: debug ? console : undefined,
        });
        this.files = new Files(this.client);
        this.issues = new Issues(this.client);
    }
}
