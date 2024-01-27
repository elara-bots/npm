import { CronJob, CronJobParams } from "cron";
import { name, version } from "../package.json";

export const defTimeZone = "America/Los_Angeles";

export class CronClient {
    private crons = new Map<string, CronJob>();
    public constructor(
        public timeZone: string = defTimeZone,
        private debug: boolean = false
    ) {}

    #debug(...args: unknown[]) {
        if (!this.debug) {
            return;
        }
        console.log(`[${name}, v${version}]: [DEBUGGER]`, ...args);
        return;
    }

    public add(options: {
        name: string;
        time: CronJobParams["cronTime"];
        run: () => Promise<unknown> | unknown;
        timeZone?: string;
        onStartup?: boolean;
    }) {
        if (this.crons.has(options.name)) {
            this.#debug(
                `[CRON:ADD]: Cronjob (${options.name}) already exists!`
            );
            return this;
        }
        this.crons.set(
            options.name,
            new CronJob(
                options.time,
                () => {
                    this.#debug(`[RUNNING]: ${options.name}`);
                    options.run();
                    return;
                },
                null,
                true,
                options.timeZone ?? this.timeZone ?? defTimeZone,
                null,
                options?.onStartup ?? false,
                null
            )
        );
        return this;
    }

    public removeAll() {
        if (!this.crons.size) {
            return false;
        }
        for (const v of this.crons.keys()) {
            const job = this.crons.get(v);
            if (!job) {
                continue;
            }
            job.stop();
            this.crons.delete(v);
            this.#debug(
                `[CRON:REMOVE]: Removed CronJob (${name}) and stopped the process.`
            );
        }
        return true;
    }

    public remove(name: string) {
        const job = this.crons.get(name);
        if (!job) {
            this.#debug(`[CRON:REMOVE]: Cronjob (${name}) doesn't exist!`);
            return this;
        }
        job.stop();
        this.crons.delete(name);
        this.#debug(
            `[CRON:REMOVE]: Removed Cronjob (${name}) and stopped the process.`
        );
        return this;
    }

    public get(name: string) {
        return this.crons.get(name) ?? null;
    }

    public list() {
        const list: {
            name: string;
            job: CronJob;
        }[] = [];
        for (const name of this.crons.keys()) {
            const job = this.crons.get(name);
            if (!job) {
                continue;
            }
            list.push({ name, job });
        }
        return list;
    }
}
