import { fetch } from "@elara-services/fetch";
import { getEntries, is, isV13, parser as P } from "@elara-services/utils";
import type { Client, Guild, GuildMember, User, VoiceState } from "discord.js";
import { name, version } from "../../package.json";
import {
    AmariLevel,
    CachedOptions,
    ColorType,
    MEEShitLevel,
    Users,
} from "../interfaces";

export function random(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
/**
 * @private
 */
export function getClientIntents(client: Client) {
    // @ts-ignore
    return (client.options.intents?.bitfield ||
        client.options.intents) as number;
}
/**
 * @private
 */
export function incUserStat(
    user: CachedOptions<Users>,
    type: string,
    count = 1,
    remove?: boolean,
) {
    const find = user.stats.find(
        (c) => c.name.toLowerCase() === type.toLowerCase(),
    );
    if (find) {
        if (remove) {
            find.count -= count;
        } else {
            find.count += count;
        }
    } else {
        user.stats.push({
            name: type.toLowerCase(),
            count,
        });
    }
    return user.stats;
}
/**
 * @private
 */
export function getVoiceMultiplier(state: VoiceState) {
    let multiplier = 1;
    if (state.deaf && state.mute) {
        multiplier = 0; // because mute is always true if deaf
    } else if (state.mute) {
        multiplier = 0.5;
    }
    if (state.streaming || state.selfVideo) {
        multiplier += 1;
    }
    return multiplier;
}
/**
 * @private
 */
export async function parser(
    obj: Record<string, unknown>,
    options: Record<string, string>,
    opt: {
        guild: Guild;
        member: GuildMember;
        user: User;
    },
) {
    let str = JSON.stringify(obj);
    for (const [name, value] of getEntries(options)) {
        str = str.replace(new RegExp(`%${name}%`, "gi"), value);
    }
    return await P(JSON.parse(str), opt);
}

export function xpFor(level: number) {
    return level * level * 100;
}
/**
 * @private
 */
export function getUserAvatar(user: User | null) {
    if (!user) {
        return "";
    }
    if (isV13()) {
        // @ts-ignore
        return user.displayAvatarURL({ dynamic: false, format: "png" });
    } else {
        // @ts-ignore
        return user.displayAvatarURL({ forceStatic: true, extension: "png" });
    }
}

/**
 * @private
 */
export async function save(db: { save: () => Promise<unknown> }) {
    return db.save().catch(() => null);
}

export function tog(bool: boolean) {
    return bool ? false : true;
}
/**
 * @private
 */
export function getGuildIcon(guild: Guild | null) {
    if (!guild || !guild.icon) {
        return "";
    }
    if (isV13()) {
        // @ts-ignore
        return guild.iconURL({ dynamic: false, format: "png" });
    } else {
        // @ts-ignore
        return guild.iconURL({ forceStatic: true, extension: "png" });
    }
}

export const colors = {
    types: [
        "canvacord.username",
        "canvacord.progress.thumb",
        "arcane.progress.first",
        "arcane.progress.second",
        "arcane.username",
        "arcane.background.first",
        "arcane.background.second",
    ],
    hex: {
        white: "#fafaff",
        blue: "#4287f5",
    },
    get: (db: CachedOptions<Users>, type: ColorType, includeDef = false) => {
        if (!is.array(db.colors)) {
            return includeDef ? colors.hex.blue : undefined;
        }
        const find = db.colors.find((c) => c.type === type.toLowerCase())
            ?.color;
        if (find) {
            return find;
        }
        return includeDef ? colors.hex.blue : undefined;
    },

    valid: (type: ColorType | string) =>
        colors.types.includes(type as ColorType),
} as const;
/**
 * @private
 */
export function isThisWeek(date: Date) {
    const now = new Date();
    const weekDay = (now.getDay() + 6) % 7; // Make sure Sunday is 6, not 0
    const monthDay = now.getDate();
    let mondayThisWeek = monthDay - weekDay;

    const startOfThisWeek = new Date(Number(now));
    startOfThisWeek.setDate(mondayThisWeek);
    startOfThisWeek.setHours(0, 0, 0, 0);

    const startOfNextWeek = new Date(Number(startOfThisWeek));
    // In cases where this is a neg number, re-read mondayThisWeek
    mondayThisWeek = startOfThisWeek.getDate();
    startOfNextWeek.setDate(mondayThisWeek + 7);

    return date >= startOfThisWeek && date < startOfNextWeek;
}
/**
 * @private
 */
export async function fetchAllUsers(
    guildId: string,
    type: "mee6" | "amari" = "amari",
) {
    function format(data: {
        id: string;
        username: string;
        exp?: number;
        xp?: number;
        level: number;
        message_count?: number;
    }) {
        return {
            id: data.id,
            username: data.username || "",
            messages: data.message_count || 0,
            xp: data.exp || data.xp || 0,
            level: data.level || 0,
            raw: data as AmariLevel | MEEShitLevel,
        };
    }
    if (type === "amari") {
        const res = await fetch(`https://xp.elara.workers.dev/amari/${guildId}`)
            .header("User-Agent", `${name}, v${version}`)
            .send()
            .catch(() => null);
        if (!res || res.statusCode !== 200) {
            return [];
        }
        const json = res.json<
            | { status: true; data: AmariLevel[] }
            | { status: false; message: string }
        >();
        if (!json || !json.status) {
            return [];
        }
        return json.data.map((c) => format(c));
    }
    const leaderboard = [];
    let pageNumber = 0;
    let page;
    const fetchData = async (
        url: string,
        page = 0,
        limit = 1000,
    ): Promise<MEEShitLevel[]> => {
        const res = await fetch(url.replace(/{id}/gi, guildId))
            .query({ limit, page })
            .send()
            .catch((e) => e);
        if (!res || res.statusCode !== 200) {
            return [];
        }
        try {
            const data = res.json();
            if ("players" in data) {
                return data.players as MEEShitLevel[];
            }
            return data;
        } catch {
            return [];
        }
    };
    const lbs = {
        mee6: `https://mee6.xyz/api/plugins/levels/leaderboard/{id}`,
    };
    if (!lbs[type]) {
        return [];
    }
    while (true) {
        page = await fetchData(lbs[type], pageNumber);
        leaderboard.push(...page);
        if (page.length < 1000) {
            break;
        }
        pageNumber += 1;
    }
    return leaderboard.map((c) => format(c));
}
/**
 * @private
 */
export function getData(db: CachedOptions<Users>) {
    const current = db.xp - xpFor(db.level);
    return {
        xp: {
            current: current > 1 ? current : 0,
            required: xpFor(db.level + 1) - xpFor(db.level),
        },
        level: db.level,
    };
}
