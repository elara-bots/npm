import { time as Time, TimestampStylesString } from "discord.js";
import moment, { type DurationInputArg1, type unitOfTime } from "moment";
import MS from "ms";
// eslint-disable-next-line @typescript-eslint/no-var-requires
require("moment-duration-format")(moment);
// eslint-disable-next-line prefer-const
export let times = {
    timeZone: "",
    short: "",
};

export function getTimeFrom(
    time: DurationInputArg1,
    name: unitOfTime.DurationConstructor,
    date: Date | string,
) {
    return moment(date ? new Date(date) : new Date())
        .add(time, name)
        .toISOString();
}

export const ms = {
    get(ms: number, long = true) {
        return MS(ms, { long });
    },
    convert(seconds: number) {
        if (typeof seconds !== "number") {
            return "Removed";
        }
        if (seconds === 0) {
            return "Off";
        }
        const days = Math.floor(seconds / (24 * 60 * 60));
        seconds -= days * (24 * 60 * 60);
        const hours = Math.floor(seconds / (60 * 60));
        seconds -= hours * (60 * 60);
        const minutes = Math.floor(seconds / 60);
        seconds -= minutes * 60;
        return `${0 < days ? days + ` Day${days === 1 ? "" : "s"}, ` : ""}${
            hours === 0
                ? ""
                : `${hours} Hour${hours === 1 ? "" : "s"}${
                      (minutes && seconds) === 0 ? "" : ", "
                  }`
        }${
            minutes !== 0
                ? `${minutes} Minute${minutes === 1 ? "" : "s"}${
                      seconds === 0 ? "" : ", "
                  }`
                : ""
        }${
            seconds !== 0 ? `${seconds} Second${seconds === 1 ? "" : "s"}` : ""
        }`;
    },
};

export function getTimeLeft(date: Date | string, type: string) {
    return (
        moment
            .duration(new Date(date).getTime() - new Date().getTime())
            // @ts-ignore
            .format(type)
            .toString()
            .startsWith("-")
    );
}

export function getTimeRemaining(
    date: Date | string,
    type: string,
    reverse = false,
) {
    return (
        moment
            .duration(
                reverse
                    ? new Date(date).getTime() - new Date().getTime()
                    : new Date().getTime() - new Date(date).getTime(),
            )
            // @ts-ignore
            .format(type)
    );
}

export type TimeFormatDate = Date | string;

export function timeFormat(
    date: TimeFormatDate,
    discordFormat = false,
    format: TimestampStylesString = "f",
) {
    if (discordFormat) {
        return Time(new Date(date), format);
    }
    return `${new Date(date || new Date()).toLocaleString(
        "en-US",
        times.timeZone ? { timeZone: times.timeZone } : undefined,
    )}${times.short ? ` (${times.short})` : ""}`;
}

export const time = {
    countdown: (ms: number) => timeFormat(new Date(Date.now() + ms), true, "R"),
    relative: (date: TimeFormatDate) => timeFormat(date, true, "R"),
    long: {
        dateTime: (date: TimeFormatDate) => timeFormat(date, true, "F"),
        time: (date: TimeFormatDate) => timeFormat(date, true, "T"),
        date: (date: TimeFormatDate) => timeFormat(date, true, "D"),
    },
    short: {
        dateTime: (date: TimeFormatDate) => timeFormat(date, true, "f"),
        time: (date: TimeFormatDate) => timeFormat(date, true, "t"),
        date: (date: TimeFormatDate) => timeFormat(date, true, "d"),
    },
};
