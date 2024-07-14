import { RepoDataWithBranch } from "./types";

export function createURL(data: RepoDataWithBranch, path?: string) {
    return `https://github.com/${data.owner}/${data.repo}${
        data.branch ? `/tree/${data.branch}` : ``
    }${path ? `/${path}` : ""}`;
}
