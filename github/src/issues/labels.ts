import { Octokit } from "@octokit/rest";
import {
    CreateIssueLabelOption,
    DeleteIssueLabelOption,
    GetIssueLabelOption,
    ListIssuesOption,
    RemoveALLIssueLabelOption,
    RemoveIssueLabelOption,
    UpdateIssueLabelOption,
} from "../types";

export class IssueLabels {
    public constructor(private client: Octokit) {}

    public async create(data: CreateIssueLabelOption) {
        return await this.client.issues.createLabel({
            ...data.repo,
            name: data.name,
            color: data.color,
            description: data.description,
        });
    }

    public async update(data: UpdateIssueLabelOption) {
        return await this.client.issues.updateLabel({
            ...data.repo,
            name: data.name,
            color: data.color,
            description: data.description,
            new_name: data.new_name || data.name,
        });
    }

    public async get(data: GetIssueLabelOption) {
        return await this.client.issues.getLabel({
            ...data.repo,
            name: data.name,
        });
    }

    public get list() {
        return {
            issue: async (data: ListIssuesOption) => {
                return await this.client.issues.listLabelsOnIssue({
                    ...data.repo,
                    per_page: data.per_page || 100,
                    page: data.page,
                    issue_number: data.issue,
                });
            },

            repo: async (data: Omit<ListIssuesOption, "issue">) => {
                return await this.client.issues.listLabelsForRepo({
                    ...data.repo,
                    per_page: data.per_page || 100,
                    page: data.page,
                });
            },
        };
    }

    /**
     * @note This will remove all issue labels from an issue (it will not delete them from the repo)
     */
    public async removeALL(data: RemoveALLIssueLabelOption) {
        return await this.client.issues.removeAllLabels({
            ...data.repo,
            issue_number: data.issue,
        });
    }

    public async remove(data: RemoveIssueLabelOption) {
        return await this.client.issues.removeLabel({
            ...data.repo,
            issue_number: data.issue,
            name: data.name,
        });
    }

    /**
     * @note THIS WILL delete the label from the repo!
     * @note To remove a label from an issue use `issues.labels.remove()`
     */
    public async delete(data: DeleteIssueLabelOption) {
        return await this.client.issues.deleteLabel({
            ...data.repo,
            name: data.name,
        });
    }
}
