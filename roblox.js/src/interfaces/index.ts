export interface User {
    tag: string;
    id: string;
    displayAvatarURL: () => string;
}

export interface UserResults {
    user: {
        id: string;
    }
}

export interface RobloxOptions {
    cookie?: string;
    debug?: boolean;
    avatarUrl?: string;
    apis?: {
        rover?: boolean;
        bloxlink?: boolean;
        rowifi?: boolean;
        rocord?: boolean;
        rolinkapp?: boolean;
    };
    keys?: {
        rover?: string;
        bloxlink?: string;
        rocord?: string;
        rolinkapp?: string;
    };
}

export type Events = "fetch" | "failed";

export type Services = "RoCord" | "RoVer" | "BloxLink" | "RoWifi" | "RolinkApp"
export type RequestMethod = "GET" | "POST" | "PATCH" | "DELETE" | "PUT";

export interface SearchUser {
    name: string;
    displayName: string;
    id: number;
    hasVerifiedBadge: boolean;
    previousUsernames: string[]
}
export interface FetchedUser extends Omit<SearchUser, "previousUsernames"> {
    created: string;
    description: string;
    externalAppDisplayName: string | null;
}

export interface RobloxGroupAPI {
    isPrimaryGroup: boolean;
    group: {
        name: string;
        id: number;
        memberCount: number;
        owner: string;
        shout: string;
    };
    role?: {
        id: string;
        rank: string;
        name: string;
    };
}

export interface RobloxGroup {
    name: string;
    id: number;
    role_id: string;
    rank: string;
    role: string;
    members: number;
    url: string;
    primary: boolean;
    inclan: boolean;
    emblem: { id: 0, url: "" };
    owner: string | null;
    shout: string | null;
    raw: object
}