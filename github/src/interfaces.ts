import { RestEndpointMethodTypes } from "@octokit/rest";
import { XOR } from "ts-xor";

export interface BaseRepoData {
    /** The name of the owner of the repo */
    owner: string;
    /** The name of the repo to use */
    repo: string;
}

export interface BaseOptions<T extends BaseRepoData> {
    repo: T;
}

export interface RepoDataWithBranch extends BaseRepoData {
    /** The branch to use on the repo */
    branch?: string;
}

export interface BaseFileCreate extends BaseOptions<RepoDataWithBranch> {
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

export interface CreateIssueOption extends BaseOptions<BaseRepoData> {
    title: string;
    body?: string;
    assignees?: string[];
    labels?: RestEndpointMethodTypes["issues"]["create"]["parameters"]["labels"];
    milestone?: RestEndpointMethodTypes["issues"]["create"]["parameters"]["milestone"];
}

export interface LockIssueOption extends BaseOptions<BaseRepoData> {
    issue: number;
    reason?: RestEndpointMethodTypes["issues"]["lock"]["parameters"]["lock_reason"];
}

export interface CreateIssueCommentOption extends BaseOptions<BaseRepoData> {
    issue: number;
    content: string;
    lock?: LockIssueOption["reason"];
}

export interface UnlockIssueOption extends BaseOptions<BaseRepoData> {
    issue: number;
    comment?: string;
}

export interface DeleteCommentOption extends BaseOptions<BaseRepoData> {
    /** The comment ID */
    id: number;
}
