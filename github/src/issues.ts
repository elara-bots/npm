import { Octokit } from "@octokit/rest";
import {
    CreateIssueCommentOption,
    CreateIssueOption,
    DeleteCommentOption,
    LockIssueOption,
    UnlockIssueOption,
} from "./interfaces";

export class Issues {
    public constructor(private client: Octokit) {}

    public async create(data: CreateIssueOption) {
        return await this.client.issues.create({
            ...data.repo,
            title: data.title,
            body: data.body,
            assignees: data.assignees,
            labels: data.labels,
            milestone: data.milestone,
        });
    }

    public async lock(data: LockIssueOption) {
        return await this.client.issues.lock({
            ...data.repo,
            issue_number: data.issue,
            lock_reason: data.reason,
        });
    }

    public async comment(data: CreateIssueCommentOption) {
        const r = await this.client.issues.createComment({
            ...data.repo,
            issue_number: data.issue,
            body: data.content,
        });

        if (data.lock) {
            await this.lock({
                repo: data.repo,
                issue: data.issue,
                reason: data.lock,
            });
        }
        return r;
    }

    public async unlock(data: UnlockIssueOption) {
        const r = await this.client.issues.unlock({
            ...data.repo,
            issue_number: data.issue,
        });

        if (data.comment) {
            await this.comment({
                repo: data.repo,
                content: data.comment,
                issue: data.issue,
            });
        }

        return r;
    }

    public async delComment(data: DeleteCommentOption) {
        return await this.client.issues.deleteComment({
            ...data.repo,
            comment_id: data.id,
        });
    }
}
