import type { APIEmbed } from "discord-api-types/v10";
import type { Document, Types } from "mongoose";

export interface Users {
    /**
     * The data that belongs to this user ID
     */
    userId: string;
    /**
     * The server ID where this data is to be used for.
     */
    guildId: string;
    /**
     * The XP amount the user has currently.
     */
    xp: number;
    /**
     * The level the user has currently.
     */
    level: number;
    /**
     * The background url to be used for 'rank cards'
     */
    background: string;

    /**
     * The voice data stored while the user is in voice chat. (duration: the Date.now() for when they joined the voice channel)
     * voice.multiplier is the amount of multipler used when the leave the voice channel. (on every update it will update the multiplier to their current state)
     */
    voice: {
        duration: number;
        multiplier: number;
    };

    /**
     * The toggles for certain features
     */
    toggles: {
        /**
         * If the user doesn't want DMs from the bot about new levelups
         */
        dms: boolean;
        /**
         * If the user's profile is locked from earning XP
         */
        locked: boolean;
        /**
         * If the user wants to be pinged for levelups
         */
        pings: boolean;
    };

    stats: {
        name: string;
        count: number;
    }[];

    colors: {
        type: ColorType;
        color: string;
    }[];

    cooldowns: {
        name: CooldownType;
        date: number;
        cooldown: number;
    }[];
}

export type CooldownType = "xp";

export type ColorType =
    | "canvacord.username"
    | "canvacord.progress.thumb"
    | "arcane.progress.first"
    | "arcane.progress.second"
    | "arcane.username"
    | "arcane.background.first"
    | "arcane.background.second";

export interface AmariLevel {
    id: string;
    username: string;
    exp: number;
    level: number;
    weeklyExp: unknown;
}

export interface MEEShitLevel {
    avatar: string;
    detailed_xp: number[];
    discriminator: string;
    guild_id: string;
    id: string;
    is_monetized_subscriber: boolean;
    level: number;
    message_count: number;
    monetize_xp_boost: number;
    username: string;
    xp: number;
}

export interface Weekly {
    guildId: string;
    /** The ID to use to search for this weekly leaderboard */
    id: string;
    /** The DateString to use for this week's leaderboard data. */
    endOfWeek: string;
    /** To check if this has been announced automatically (ONLY works if the weekly channel ID is set!)  */
    announced: boolean;
    /** The server users stats for the week */
    users: WeeklyUser[];
    /** The server's stats (messages, voice, xp)  */
    stats: WeeklyServerStats;
}

export interface WeeklyServerStats {
    messages: number;
    voice: number;
    xp: number;
}

export interface WeeklyUser {
    userId: string;
    messages: number;
    level: number;
    voice: number;
    xp: number;
}
export type AnnounceToggleTypes =
    | "dm"
    | "channel"
    | "ping"
    | "onlyRegisteredLevels";
export type ServerToggleTypes =
    | "leveling"
    | "resetOnLeave"
    | "stackRoles"
    | "weeklyleaderboard"
    | "voice.xp"
    | "voice.unmutedRequired"
    | "weekly.announce";
export type UserToggles = "locked" | "pings" | "dms";
export type MemberPresenceStatus =
    | "online"
    | "idle"
    | "dnd"
    | "invisible"
    | "offline";

export type Options = {
    content: string;
    embeds: APIEmbed[];
};

export type OptionalOptions = {
    content?: string;
    embeds?: APIEmbed[];
};

export interface UserCache {
    cooldown: number;
    date: number;
    search: string;
}

export interface LeaderboardCanvasPlayers {
    displayName: string;
    username: string;
    level: number;
    xp: number;
    rank: number;
    avatar: string;
}

export interface WeeklyData {
    users?: WeeklyUserData[];
    /** The server's stats (messages, voice, xp)  */
    stats?: WeeklyServerStatsData;
}

export interface WeeklyServerStatsData {
    messages?: number;
    voice?: number;
    xp?: number;
}

export interface WeeklyUserData {
    userId: string;
    xp?: number;
    level?: number;
    messages?: number;
    voice?: number;
}

export interface LeaderboardCanvasOptions {
    background?: string;
    backgroundColor?: string;
}

export interface LeaderboardCanvasHeader {
    title: string;
    image: string;
    subtitle: string;
}

export interface Settings {
    guildId: string;
    enabled: boolean;
    cooldown: number;
    background: {
        url: string;
        color: string;
    };
    xp: {
        min: number;
        max: number;
    };
    announce: {
        channel: {
            enabled: boolean;
            ping: boolean;
            channel: string;
            options: Options;
        };
        dm: {
            enabled: boolean;
            options: Options;
        };
        weekly: {
            enabled: boolean;
            channel: string;
            roles: string[];
        };
    };
    multipliers: {
        channels: string[];
        roles: string[];
        multiplier: number;
    }[];
    ignore: {
        channels: string[];
        roles: string[];
        users: string[];
    };
    levels: {
        level: number; // Level required to gain the levels before.
        levelName: string;
        options: Options;
        roles: {
            add: string[];
            remove: string[];
        };
    }[];
    cooldowns: {
        roles: string[];
        seconds: number;
    }[];
    toggles: {
        onlyRegisteredLevels: boolean;
        stackRoles: boolean;
        resetOnLeave: boolean;
        weekly: {
            track: boolean;
        };
        voice: {
            xp: boolean;
            shouldBeUnmuted: boolean;
        };
    };
}
export type IgnoreTypes = "channels" | "roles" | "users";
export type CachedOptions<D extends object> = Document<unknown, null, D> &
    D & { _id: Types.ObjectId };

export type CanvasResponse = Promise<
    | {
          status: false;
          message: string;
      }
    | {
          status: true;
          image: Buffer;
      }
>;

export type CanvasResponseWithQuery = Promise<
    | {
          status: false;
          message: string;
      }
    | {
          status: true;
          image: Buffer;
          query: LeaderboardQuery;
      }
>;

export interface LeaderboardOptions {
    page?: number;
    perPage?: number;
    sort?: "top" | "bottom";
    sortBy?: "xp" | "level";
}

export interface LeaderboardCanvasOptions extends LeaderboardOptions {
    perPage?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
}

export type LeaderboardFormatted = LeaderboardUser & {
    user: {
        username: string;
        displayName: string;
        globalName: string | null | undefined;
        discriminator: string;
        tag: string;
        id: string;
        avatar: string;
        accentColor: `#${string}` | null | undefined;
        banner: string | null | undefined;
        bot: boolean;
        createdAt: Date;
    };
};
export type LeaderboardUser = Users & {
    position: number;
};

export interface LeaderboardFormattedResponse<D> {
    status: true;
    data: D;
    query: LeaderboardQuery;
}

export interface LeaderboardQuery {
    page: number;
    pages: number;
    sort: "top" | "bottom";
    sortBy: "xp" | "level";
    perPage: number | null;
}

export type CanvasRankProfileTypes = "canvacord" | "arcane";
export type CanvasLeaderboardTypes = "canvacord";

export interface ArcaneUser {
    username: string;
    avatar?: string | null;
    background?: string;
    xp: {
        current: number;
        max: number;
    };
    level: number;
    rank: number;
    colors?: {
        progress?: {
            first?: string;
            second?: string;
        };
        username?: string;
        background?: {
            first?: string;
            second?: string;
        };
    };
}
