import { is } from "@elara-services/utils";

export class Tasks extends null {
    async create({ id, time, shouldCancel }: TaskCreate = { id: "", time: "", shouldCancel: true }, run: (...args: unknown[]) => Promise<unknown> | unknown) {
        const sc = await import("node-schedule").catch(() => {});
        if (!sc) {
            return `Unable to find the "node-schedule" package.`;
        }
        if (!is.string(id) || !is.string(time) || !is.boolean(shouldCancel)) {
            return `You failed to provide one of the following options: 'id', 'time' or 'shouldCancel'`;
        }
        if (sc.scheduledJobs[id]) {
            return `Found (${id}) in the scheduled jobs, ignoring.`;
        }
        return sc.scheduleJob(id, time, () => {
            run();
            if (shouldCancel) {
                return void sc.cancelJob(id);
            }
        });
    }

    static async delete(id: string) {
        const sc = await import("node-schedule").catch(() => {});
        if (!sc) {
            return null;
        }
        return sc.cancelJob(id);
    }
}

export interface TaskCreate {
    id: string;
    time: string;
    shouldCancel: boolean;
}