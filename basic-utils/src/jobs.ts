import { getEntries } from ".";

export type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never };
export type XOR<T, U> = T | U extends object
    ? (Without<T, U> & U) | (Without<U, T> & T)
    : T | U;

export interface FixedInterval {
    fixed: number;
}

export interface RandomInterval {
    random: {
        min: number;
        max: number;
    };
}

export interface IntervalJob {
    interval: XOR<FixedInterval, RandomInterval>;
    run: () => Promise<unknown> | unknown;
}

export function createJob(
    interval: IntervalJob["interval"],
    run: IntervalJob["run"]
): IntervalJob {
    return { interval, run };
}

export function startAllIntervalJobs<T extends Record<string, IntervalJob>>(
    jobs: T
) {
    for (const [, { interval, run }] of getEntries(jobs)) {
        if (interval.fixed) {
            setInterval(run, interval.fixed);
            continue;
        } else if (interval.random) {
            const { min, max } = interval.random;
            const loop = () => {
                const random = Math.floor(
                    Math.random() * (max - min + 1) + min
                );
                return setTimeout(() => {
                    run();
                    loop();
                }, random);
            };
            loop();
        }
    }
}
