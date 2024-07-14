import { Octokit } from "@octokit/rest";
import { Issues } from ".";
import {
    CreateIssueCommentOption,
    DeleteCommentOption,
    GetCommentOption,
    UpdateCommentOption,
} from "../types";

export class IssueComments {
    public constructor(private client: Octokit, private issues: Issues) {}

    public async create(data: CreateIssueCommentOption) {
        const r = await this.client.issues.createComment({
            ...data.repo,
            issue_number: data.issue,
            body: data.content,
        });

        if (data.lock) {
            await this.issues.lock({
                repo: data.repo,
                issue: data.issue,
                reason: data.lock,
            });
        }
        return r;
    }

    public async update(data: UpdateCommentOption) {
        return await this.client.issues.updateComment({
            ...data.repo,
            comment_id: data.id,
            body: data.content,
        });
    }

    public async get(data: GetCommentOption) {
        return await this.client.issues.getComment({
            ...data.repo,
            comment_id: data.id,
        });
    }

    public async delete(data: DeleteCommentOption) {
        return await this.client.issues.deleteComment({
            ...data.repo,
            comment_id: data.id,
        });
    }
}
