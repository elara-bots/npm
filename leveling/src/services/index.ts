import { discord, getEntries, is, snowflakes } from "@elara-services/utils";
import { Client } from "discord.js";
import moment from "moment";
import { connect, model } from "mongoose";
import { Leveling } from "..";
import type { Weekly, WeeklyData } from "../interfaces";
import { isThisWeek } from "../utils";
import * as schemas from "./schema";
let connected = false;
export class Database {
    #url: string;
    dbs = {
        settings: model("Settings", schemas.settings),
        users: model("Users", schemas.users),
        weekly: model("weekly", schemas.weekly),
    };
    public constructor(url: string, public client: Client) {
        this.#url = url;
        this.#connect();
    }

    public get weekly() {
        return {
            get: async (guildId: string, id?: string) => {
                if (id) {
                    return await this.dbs.weekly
                        .findOne({ guildId, id })
                        .catch(() => null);
                }
                const data = await this.dbs.weekly
                    .find({ guildId })
                    .catch(() => []);
                const create = async () => {
                    return await new this.dbs.weekly({
                        guildId,
                        id: snowflakes.generate(),
                        endOfWeek: moment().endOf("week").toISOString(),
                    })
                        .save()
                        .catch(() => null);
                };
                if (is.array(data)) {
                    if (data.length) {
                        const previousWeek = moment(
                            moment().endOf("week")
                        ).subtract(1, "week");
                        const f = data.find(
                            (c) =>
                                !c.announced &&
                                c.endOfWeek === previousWeek.toISOString()
                        );
                        if (f) {
                            f.announced = true;
                            await f.save().catch(() => null);
                            this.handleWeeklyAnnounce(f);
                        }
                    }
                    const find = data.find((c) =>
                        isThisWeek(new Date(c.endOfWeek))
                    );
                    if (!find) {
                        return create();
                    }
                    return find;
                } else {
                    return create();
                }
            },

            add: async (guildId: string, data: WeeklyData) => {
                if (!Object.keys(data).length) {
                    return null;
                }
                const db = await this.weekly.get(guildId);
                if (!db) {
                    return null;
                }
                if (is.object(data.stats)) {
                    // @ts-ignore
                    for (const [name, value] of getEntries(data.stats)) {
                        if (is.number(value)) {
                            // @ts-ignore
                            db.stats[name] = Math.floor(db.stats[name] + value);
                        }
                    }
                }
                if (is.array(data.users)) {
                    for (const user of data.users) {
                        const find = db.users.find(
                            (c) => c.userId === user.userId
                        );
                        if (find) {
                            if (is.number(user.level)) {
                                find.level = Math.floor(
                                    find.level + user.level
                                );
                            }
                            if (is.number(user.xp)) {
                                find.xp = Math.floor(find.xp + user.xp);
                            }
                            if (is.number(user.messages)) {
                                find.messages = Math.floor(
                                    find.messages + user.messages
                                );
                            }
                            if (is.number(user.voice)) {
                                find.voice = Math.floor(
                                    find.voice + user.voice
                                );
                            }
                        } else {
                            db.users.push({
                                userId: user.userId,
                                level: user.level || 0,
                                xp: user.xp || 0,
                                messages: user.messages || 0,
                                voice: user.voice || 0,
                            });
                        }
                    }
                }
                return await db.save().catch(() => null);
            },
        };
    }

    public async getUser(userId: string, guildId: string) {
        let data = await this.dbs.users
            .findOne({ userId, guildId })
            .catch(() => null);
        if (!data) {
            data = await new this.dbs.users({ userId, guildId })
                .save()
                .catch(() => null);
        }
        if (!data) {
            return null;
        }
        return data;
    }

    public async getSettings(guildId: string) {
        let settings = await this.dbs.settings
            .findOne({ guildId })
            .catch(() => null);
        if (!settings) {
            settings = await new this.dbs.settings({ guildId })
                .save()
                .catch(() => null);
        }
        if (!settings) {
            return null;
        }
        return settings;
    }

    #connect() {
        if (connected) {
            return;
        }
        connected = true;
        return connect(this.#url, {
            dbName: "Leveling",
            retryReads: true,
            retryWrites: true,
        });
    }

    async handleWeeklyAnnounce(data: Weekly) {
        if (!data) {
            return;
        }
        const db = await this.getSettings(data.guildId);
        if (
            !db ||
            !db.enabled ||
            !db.announce.weekly.enabled ||
            !db.announce.weekly.channel
        ) {
            return;
        }
        const channel = await discord.channel(
            this.client,
            db.announce.weekly.channel
        );
        if (!channel || !channel.isTextBased()) {
            return;
        }
        const levels = new Leveling(this.client, "");

        const lb = await levels.api.getLeaderboard(
            data.guildId,
            {
                page: 1,
                perPage: 10,
                sort: "top",
                sortBy: "xp",
            },
            "canvacord",
            true
        );
        if (!lb.status) {
            return;
        }
        return channel
            .send({
                content: db.announce.weekly.roles.length
                    ? db.announce.weekly.roles.map((c) => `<@&${c}>`).join(", ")
                    : "",
                files: [
                    { name: "weekly.png", attachment: Buffer.from(lb.image) },
                ],
            })
            .catch(() => null);
    }
}
