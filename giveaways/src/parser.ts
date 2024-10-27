import {
    formatNumber,
    is,
    p,
    parser,
    ParserOptions,
    time,
} from "@elara-services/utils";
import { Giveaway } from "./interfaces";

export const gp = {
    id: "%id%",
    end: "%end%",
    end_timer: "%end.r%",
    end_format: "%end.f%",
    start: "%start%",
    start_timer: "%start.r%",
    start_format: "%start.f",
    prize: "%prize%",
    host: "%host%",
    wcount: "%wcount%",
    winners: "%winners%",
    count: "%count%",
    users: "%users%",
    ...p,
} as const;

export async function giveawayParser<D, R>(
    obj: object,
    db: Giveaway<D>,
    options?: ParserOptions,
    winners?: string[]
): Promise<R> {
    const s = JSON.stringify(await parser(obj, options));
    return JSON.parse(
        s
            .replace(new RegExp(gp.id, "gi"), db.id)

            .replace(new RegExp(gp.end, "gi"), new Date(db.end).toISOString())
            .replace(
                new RegExp(gp.end_timer, "gi"),
                time.relative(new Date(db.end))
            )
            .replace(
                new RegExp(gp.end_format, "gi"),
                time.long.dateTime(new Date(db.end))
            )

            .replace(
                new RegExp(gp.start, "gi"),
                new Date(db.start).toISOString()
            )
            .replace(
                new RegExp(gp.start_timer, "gi"),
                time.relative(new Date(db.start))
            )
            .replace(
                new RegExp(gp.start_format, "gi"),
                time.long.dateTime(new Date(db.start))
            )

            .replace(new RegExp(gp.prize, "gi"), db.prize)
            .replace(
                new RegExp(gp.host, "gi"),
                db.host?.id ? `<@${db.host.id}>` : "N/A"
            )
            .replace(
                new RegExp(gp.count, "gi"),
                `${formatNumber(
                    db.users.map((c) => c.entries).reduce((a, b) => a + b, 0)
                )}`
            )
            .replace(new RegExp(gp.wcount, "gi"), `${formatNumber(db.winners)}`)
            .replace(
                new RegExp(gp.winners, "gi"),
                is.array(winners)
                    ? winners.map((c) => `<@${c}>`).join(", ")
                    : "N/A"
            )
            .replace(
                new RegExp(gp.users, "gi"),
                is.array(db.users)
                    ? db.users.map((c) => `<@${c.id}>`).join(", ")
                    : "N/A"
            )
    );
}
