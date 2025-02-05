import { Octokit } from "@octokit/rest";
import {
    CreateIssueOption,
    LockIssueOption,
    UnlockIssueOption,
    UpdateIssueOption,
} from "../types";
import { IssueComments } from "./comments";
import { IssueLabels } from "./labels";

export class Issues {
    public readonly comments: IssueComments;
    public readonly labels: IssueLabels;
    public constructor(private client: Octokit) {
        this.comments = new IssueComments(client, this);
        this.labels = new IssueLabels(client);
    }

    public async create(
        data: CreateIssueOption,
        validateLabels: boolean = true
    ) {
        const labels: CreateIssueOption["labels"] = [];
        if (data.labels) {
            const rL = validateLabels
                ? await this.labels.list
                      .repo({ repo: data.repo })
                      .catch(() => null)
                : null;
            for (const l of data.labels) {
                if (typeof l !== "string") {
                    labels.push(l);
                    continue;
                }
                if (!validateLabels) {
                    labels.push(l);
                    continue;
                }
                if (rL && Array.isArray(rL.data) && rL.data?.length) {
                    const f = rL.data.find(
                        (c) =>
                            c.name === l ||
                            c.name.toLowerCase() === l.toLowerCase() ||
                            c.name.toLowerCase().includes(l.toLowerCase())
                    );
                    if (f) {
                        labels.push(f.name);
                    }
                }
            }
        }
        return await this.client.issues.create({
            labels,
            ...data.repo,
            body: data.body,
            title: data.title,
            assignees: data.assignees,
            milestone: data.milestone,
        });
    }

    public async update(data: UpdateIssueOption) {
        return await this.client.issues.update({
            ...data.repo,
            issue_number: data.issue,
            assignees: data.assignees,
            state: data.state,
            state_reason: data.state_reason,
            labels: data.labels,
            title: data.title,
            milestone: data.milestone,
            body: data.body,
        });
    }

    public async lock(data: LockIssueOption) {
        return await this.client.issues.lock({
            ...data.repo,
            issue_number: data.issue,
            lock_reason: data.reason,
        });
    }

    public async unlock(data: UnlockIssueOption) {
        const r = await this.client.issues.unlock({
            ...data.repo,
            issue_number: data.issue,
        });

        if (data.comment) {
            await this.comments.create({
                repo: data.repo,
                content: data.comment,
                issue: data.issue,
            });
        }

        return r;
    }
}
