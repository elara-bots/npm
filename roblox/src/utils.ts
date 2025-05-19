import { debug, make, Nullable } from "@elara-services/basic-utils";
import { APIUser } from "discord-api-types/v10";
import { name } from "../package.json";
import type { DefaultRobloxServiceData, RobloxResponse, StrNum } from "./interfaces";

const base = `roblox.com/v1` as const;

export const def = {
    avatar: `https://roblox.s8n.workers.dev/avatar/%USERID%`,
    info: `https://roblox.s8n.workers.dev/info/%USERID%`,
}

export function isNumberOnly(txt: StrNum) {
    return /^\d+$/.test(`${txt}`);
}

export function createService(data: DefaultRobloxServiceData) {
    return data;
}

export const bug = (...args: unknown[]) => debug.log(name, ...args);


export const messages = {
    ERROR: `Unknown error while trying to fetch the data.` as const,
    NO_SERVICES: `There is no custom or default services setup.` as const,
    BIO: "Bio",
    STATUS: "Status",
    URL: "URL",
    PROFILE: "Profile",
    AVATAR: "Avatar",
    ID: "ID",
    PRIMARY: "Primary",
    RANK: "Rank",
    ROLE: "Role",
    LINK: "Link",
    OFFLINE: "Offline",
    PAST_NAMES: "Past Names",
    JOINED: "Joined",
    COUNTS: "Counts",
    FRIENDS: "Friends",
    FOLLOWERS: "Followers",
    FOLLOWING: "Following",
    GROUPS: "Groups",
    USERNAME: "Username",
    ACTIVITY: "Activity",
    LAST_SEEN: "Last Seen",
    GAME_URL: (url: string) => `Game: [URL](${url} "Click here to view the game!")`,
    USER_NOT_VERIFIED: (id: string, service?: string) => `User (${id}) not verified${service ? ` with (${service}) service` : ""}.` as const,
    SERVICE_NOT_FOUND: (name: string, isDefault = false) => `${isDefault ? `Default` : `Custom`} Service (${name}) not found${isDefault ? `, make sure to setup this default service before trying to use it.` : "."}` as const,
    NO_DATA_FOUND: (search: string) => `Nothing found for (${search})` as const,
    NOT_FOUND: (name: string, def = false) => `${def ? "Default " : ""}Roblox Service (${name}) not found.`,
    API_KEY_REQUIRED: (name: string) => `Default Roblox Service (${name}) requires an API key.`,
    REQUIRED: (name: string, requirement: string) => `Default Roblox Service (${name}) requires '${requirement}'`,
    AUTHOR: (user: Nullable<APIUser>, res: RobloxResponse) => ({ 
        name: `Roblox Info for ${user ? `${user.username}${user.discriminator !== "0" ? `#${user.discriminator}` : ``} (${user.id})` : `ID: ${res.user.id}`}`, 
        icon_url: user ?  make.image.users.avatar(user.id, user.avatar || "") : make.emojiURL("411630434040938509"), 
        url: `https://services.elara.workers.dev/support` 
    }),
    FOOTER: (warn: boolean) => ({ text: warn ? `This will only show up to 4 groups!` : `` })
}

export const ROBLOX_API = {
    USER: {
        URL: (id: StrNum) => `https://roblox.com/users/${`${id}`}/profile` as const,
        INFO: (id: StrNum) => `https://users.${base}/users/${`${id}`}` as const,
        SEARCH: (name: string, limit = 10) => `https://users.${base}/users/search?keyword=${encodeURIComponent(name)}&limit=${limit}` as const,
        PRESENCES: `https://presence.${base}/presence/users` as const,
    },
    GROUP: {
        URL: (id: StrNum) => `https://roblox.com/groups/${`${id}`}` as const,
        ROLES: (user: StrNum) => `https://groups.${base}/users/${`${user}`}/groups/roles` as const,
    }
}