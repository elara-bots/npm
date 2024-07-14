import { RestEndpointMethodTypes } from "@octokit/rest";
import {
    BaseCommentData,
    BaseIssueData,
    BaseIssueLabel,
    BaseOptions,
    BaseRepoData,
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
