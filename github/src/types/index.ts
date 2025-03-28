import { RestEndpointMethodTypes } from "@octokit/rest";
import {
    BaseCommentData,
    BaseIssueData,
    BaseIssueLabel,
    BaseOptions,
    BaseRepoData,
    RepoDataWithBranch,
} from "./base";
export type * from "./base";

type R = RestEndpointMethodTypes["issues"];

/** -- ISSUES -- */
export interface CreateIssueOption extends BaseOptions<BaseRepoData> {
    title: string;
    body?: string;
    assignees?: string[];
    labels?: R["create"]["parameters"]["labels"];
    milestone?: R["create"]["parameters"]["milestone"];
}

export interface UpdateIssueOption extends Partial<CreateIssueOption> {
    issue: number;
    repo: BaseRepoData;
    state?: R["update"]["parameters"]["state"];
    state_reason?: R["update"]["parameters"]["state_reason"];
}

export interface LockIssueOption extends BaseIssueData {
    reason?: R["lock"]["parameters"]["lock_reason"];
}

export interface UnlockIssueOption extends BaseIssueData {
    comment?: string;
}

/** --- ISSUE COMMENTS --- */
export interface CreateIssueCommentOption extends BaseIssueData {
    content: string;
    lock?: LockIssueOption["reason"];
}
export interface GetCommentOption extends BaseCommentData {}
export interface DeleteCommentOption extends BaseCommentData {}

export interface UpdateCommentOption extends BaseCommentData {
    content: string;
}

export interface CreateIssueLabelOption extends BaseIssueLabel {
    color?: R["createLabel"]["parameters"]["color"];
    description?: R["createLabel"]["parameters"]["description"];
}

export interface UpdateIssueLabelOption extends BaseIssueLabel {
    color?: R["updateLabel"]["parameters"]["color"];
    description?: R["updateLabel"]["parameters"]["description"];
    new_name?: R["updateLabel"]["parameters"]["new_name"];
}

export interface ListIssuesOption extends BaseIssueData {
    /** A number between 1-100 (default: 100) */
    per_page?: number;
    page?: number;
}

export interface GetIssueLabelOption extends BaseIssueLabel {}
export interface RemoveIssueLabelOption extends BaseIssueLabel, BaseIssueData {}
export interface RemoveALLIssueLabelOption extends BaseIssueData {}
export interface DeleteIssueLabelOption extends BaseIssueLabel {}

export interface FilesGetOptions extends BaseOptions<BaseRepoData> {
    /** The branch to use */
    ref?: string;
    /** The full path to the file you want to get */
    path: string;
}

export interface FilesRemoveOptions extends FilesGetOptions {
    /** If no 'sha' is provided then it will automatically fetch it from the API */
    sha?: string;
    message?: string;
}
