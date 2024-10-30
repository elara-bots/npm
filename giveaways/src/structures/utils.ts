import {
    getAllBrackets,
    getPluralTxt,
    is,
    make,
    status,
    XOR,
} from "@elara-services/utils";
import { GuildMember } from "discord.js";
import type {
    AddGiveaway,
    AddGiveawayWithTemplate,
    Entries,
    GiveawayDatabase,
    RoleTypes,
} from "../interfaces";
import { GiveawayBuilder } from "./builder";
import { GiveawayClient } from "./client";

export class GiveawayUtils {
    public constructor(private api: GiveawayClient) {}

    public getLevelRequirements(db: GiveawayDatabase | string) {
        const levels = this.brackets.levels(db);
        if (!is.array(levels)) {
            return null;
        }
        return `Required Level${getPluralTxt(levels)}: ${levels.join(", ")}`;
    }
    public levels(userLevel: number, requiredLevels: number[]) {
        for (const l of requiredLevels) {
            if (userLevel >= l) {
                return status.success(`All good!`);
            }
        }
        return status.error(
            `You don't meet the level requirements for this giveaway!\n-# You need to be one of these levels: ${requiredLevels
                .map((c) => `**${c}**`)
                .join(", ")}\n-# Your current level: **${userLevel}**`
        );
    }
    public roles(db: XOR<AddGiveaway, AddGiveawayWithTemplate>) {
        const json = new GiveawayBuilder(db).toJSON();
        for (const n of make.array<RoleTypes>(["add", "remove", "required"])) {
            const r = this.brackets.roles(db.prize || "", n);
            if (is.array(r)) {
                json.roles[n] = [...new Set([...json.roles[n], ...r])];
            }
        }
        return json.roles;
    }
    public get brackets() {
        return {
            get: (db: GiveawayDatabase | string, removeBrackets = true) => {
                const str = is.string(db) ? db : db.prize;
                return getAllBrackets(str, removeBrackets);
            },
            levels: (db: GiveawayDatabase | string) => {
                return this.brackets
                    .get(db, true)
                    .filter((c) => c.toLowerCase().startsWith("level"))
                    .map((c) => parseInt(c.split(":")[1]))
                    .sort((a, b) => b - a);
            },
            roles: (db: GiveawayDatabase | string, name: string) => {
                return [
                    ...new Set(
                        this.brackets
                            .get(db, true)
                            .filter((c) => c.toLowerCase().startsWith(name))
                            .map((c) => {
                                const s = c.split(":")[1];
                                // eslint-disable-next-line no-useless-escape
                                const search = new RegExp(
                                    [",", "\\|", "-", "/"].join("|"),
                                    "gi"
                                );
                                if (s.match(search)) {
                                    return s.split(search);
                                } else {
                                    return [s];
                                }
                            })
                            .flatMap((c) => c)
                    ).values(),
                ];
            },
            entries: (db: GiveawayDatabase | string) => {
                const list = make.array<Entries>();
                const entries = this.brackets.get(db, true);
                if (!is.array(entries)) {
                    return list;
                }
                for (const e of entries) {
                    const entry: Entries = {
                        roles: [],
                        amount: 1,
                    };
                    for (const c of e.split(":").filter((c) => c !== "entry")) {
                        if (c.includes(",") || c.length > 15) {
                            entry.roles.push(...c.split(","));
                        }
                        if (is.number(parseInt(c)) && c.length <= 15) {
                            entry.amount = parseInt(c);
                        }
                    }
                    if (is.array(entry.roles)) {
                        list.push(entry);
                    }
                }
                return list;
            },
        };
    }
    public async isAuthorized(
        guildId: string,
        channelId: string,
        member: GuildMember
    ) {
        if (member.permissions.has(40n)) {
            // If the user has Administrator or Manage Server permissions, then don't search the database
            return true;
        }
        const db = await this.api.settings.get(guildId);
        if (!db) {
            return false;
        }
        const f = (db.authorized || []).find((c) => c.channelId === channelId);
        if (f) {
            if (is.array(f.roles) && member.roles.cache.hasAny(...f.roles)) {
                return true;
            }
            if (is.array(f.users) && f.users.includes(member.id)) {
                return true;
            }
        }
        return false;
    }
    entries(e: Entries[]) {
        const list = make.array<Entries>();
        for (const c of e) {
            const f = list.find(
                (x) =>
                    x.amount === c.amount &&
                    c.roles.toString() === x.roles.toString()
            );
            if (!f) {
                list.push(c);
            }
        }
        return list;
    }
}
