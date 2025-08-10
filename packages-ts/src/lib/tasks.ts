import { is, PossiblePromise, snowflakes } from "@elara-services/basic-utils";
import { cancelJob, scheduledJobs, scheduleJob, type Job } from "node-schedule";

export type TaskCreateRun = (...args: unknown[]) => PossiblePromise<unknown>;

export const Tasks = {
    create: ({ id, time, shouldCancel }: TaskCreate = {
        id: "",
        time: "",
        shouldCancel: true,
    }, run: TaskCreateRun) => {
        if (!is.string(id) || !is.string(time) || !is.boolean(shouldCancel)) {
            return `You failed to provide one of the following options: 'id', 'time' or 'shouldCancel'`;
        }
        if (scheduledJobs[id]) {
            return `Found (${id}) in the scheduled jobs, ignoring.`;
        }
        return scheduleJob(id, time, () => {
            run();
            if (shouldCancel) {
                return void cancelJob(id);
            }
        });
    },

    has: (id: string) => scheduledJobs[id] ? true : false,

    delete: (id: string) => cancelJob(id),

    cancelAll: () => {
        for (const v of Object.values(scheduledJobs)) {
            v.cancel();
        }
    },

    list: () => {
        const list = new Map<string, Job>();
        for (const v of Object.keys(scheduledJobs)) {
            if (!scheduledJobs[v]) {
                continue;
            }
            list.set(v, scheduledJobs[v]);
        }
        return list;
    },

    dateFrom: (ms: number) => new Date(Date.now() + ms).toISOString(),
    repeat: (
        id: string,
        ms: number,
        run: TaskCreateRun,
    ) => {
        if (!id.startsWith("repeat-")) {
            id = `repeat-${id}-${snowflakes.generate()}`;
        }
        const schedule = () => Tasks.create({
            id,
            time: Tasks.dateFrom(ms),
            shouldCancel: true,
        }, () => {
            Tasks.repeat(`${id.split("-").slice(0, 2).join("-")}-${snowflakes.generate()}`, ms, run);
            run();
        });

        schedule();
    },
};

export interface TaskCreate {
    id: string;
    time: string;
    shouldCancel: boolean;
}