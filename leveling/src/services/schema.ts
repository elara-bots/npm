import { Schema } from "mongoose";
import type { Settings, Users, Weekly } from "../interfaces";

const t = {
    string: (def = "") => ({ type: String, default: def }),
    boolean: (def = true) => ({ type: Boolean, default: def }),
    array: <D extends string>(def = []) => ({
        type: Array,
        default: def as D[],
    }),
    num: (def = 0) => ({ type: Number, default: def }),
};

const options = {
    content: t.string(),
    embeds: t.array(),
};

export const users = new Schema<Users>({
    userId: t.string(),
    guildId: t.string(),
    xp: t.num(),
    level: t.num(),
    background: t.string(),
    voice: {
        duration: t.num(),
        multiplier: t.num(),
    },
    toggles: {
        locked: t.boolean(false),
        dms: t.boolean(),
        pings: t.boolean(),
    },
    stats: [
        new Schema({
            name: t.string(),
            count: t.num(),
        }),
    ],
    colors: [
        new Schema({
            type: t.string(),
            color: t.string(),
        }),
    ],
    cooldowns: [
        new Schema({
            name: t.string(),
            date: t.num(),
            cooldown: t.num(),
        }),
    ],
});

export const settings = new Schema<Settings>({
    guildId: t.string(),
    enabled: t.boolean(false),
    cooldown: t.num(60), // In seconds
    background: {
        url: t.string(),
        color: t.string(),
    },
    webhook: {
        name: t.string(),
        image: t.string(),
    },
    xp: {
        min: t.num(1),
        max: t.num(8),
    },
    announce: {
        channel: {
            enabled: t.boolean(),
            ping: t.boolean(),
            channel: t.string(),
            options,
        },
        dm: {
            enabled: t.boolean(false),
            options,
        },
        weekly: {
            enabled: t.boolean(false),
            channel: t.string(),
            roles: t.array(),
        },
    },
    ignore: {
        channels: t.array(),
        roles: t.array(),
        users: t.array(),
    },
    levels: [
        new Schema({
            level: t.num(),
            levelName: t.string(),
            options,
            roles: {
                add: t.array(),
                remove: t.array(),
            },
        }),
    ],
    multipliers: [
        new Schema({
            channels: t.array(),
            roles: t.array(),
            multiplier: t.num(),
        }),
    ],
    cooldowns: [
        new Schema({
            roles: t.array(),
            seconds: t.num(),
        }),
    ],
    toggles: {
        onlyRegisteredLevels: t.boolean(false),
        useWebhook: t.boolean(true),
        stackRoles: t.boolean(false),
        resetOnLeave: t.boolean(false),
        earnXPOnSlashCommands: t.boolean(false),
        weekly: {
            track: t.boolean(false),
        },
        voice: {
            xp: t.boolean(false),
            shouldBeUnmuted: t.boolean(true),
        },
    },
});

export const weekly = new Schema<Weekly>({
    guildId: t.string(),
    id: t.string(),
    endOfWeek: t.string(),
    announced: t.boolean(false),
    users: [
        new Schema({
            userId: t.string(),
            messages: t.num(),
            level: t.num(),
            voice: t.num(),
            xp: t.num(),
        }),
    ],
    stats: {
        messages: t.num(),
        voice: t.num(),
        xp: t.num(),
    },
});
