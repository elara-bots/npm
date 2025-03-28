import type { XOR } from "ts-xor";

export interface BaseRepoData {
    /** The name of the owner of the repo */
    owner: string;
    /** The name of the repo to use */
    repo: string;
}

export interface BaseOptions<T extends BaseRepoData> {
    repo: T;
}

export interface BaseCommentData extends BaseOptions<BaseRepoData> {
    /** The comment ID */
    id: number;
}

export interface BaseIssueData extends BaseOptions<BaseRepoData> {
    /** The issue ID */
    issue: number;
}

export interface RepoDataWithBranch extends BaseRepoData {
    /** The branch to use on the repo */
    branch?: string;
}

export interface BaseFileCreate extends BaseOptions<RepoDataWithBranch> {
    /** Only needed for updating the file's contents */
    sha?: string;
    /** The full path to the file on the repo. (i.e: "examples/test.png") */
    path: string;
    /** The commit message */
    message?: string;
}

export interface FileCreateWithURL extends BaseFileCreate {
    /** The url to fetch the data from. */
    url: string;
}

export interface FileCreateWithData extends BaseFileCreate {
    /** The data to set for the file path provided. */
    data: string;
}

export type FileCreateOptions = XOR<FileCreateWithURL, FileCreateWithData>;

export interface BaseIssueLabel extends BaseOptions<BaseRepoData> {
    name: string;
}
