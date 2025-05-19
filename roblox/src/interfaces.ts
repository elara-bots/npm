import { Nullable, StatusFailed, XOR } from "@elara-services/basic-utils";
import { RequestMethod } from "@elara-services/fetch";
import * as DefaultRobloxServices from "./lib";

export interface RobloxServiceData {
    /**
     * The name of the roblox service. (ex: RoCord)
     */
    name: string,

    /**
     * The priority of the service, what gets requested first then moves on down the list. by default this will be last one in the list +1
     */
    priority: number;

    /**
     * The handler for this service, can just add the api key/url or use the custom function to return the robloxId
     */
    handler: RobloxServiceDataHandler;
}

export type Required = "api_key" | "guild_id";

export interface DefaultRobloxServiceData extends RobloxServiceData {
    name: DefaultService;
    handler: RobloxServiceDataHandler;
}

export type APIKeys = {
    /** The prefix for the authorization header (ex: Bearer or Bot) */
    prefix?: string;
    /** Use 'all' to signal this key is for all servers. */
    list: Record<string, string>
}

export type RobloxServiceDataHandlerCustom = {
    status: true,
    robloxId: string
} | StatusFailed;

export type DefaultService = keyof typeof DefaultRobloxServices;

export type RobloxServiceDataHandler = XOR<{
    required?: Required[];
    /** If the service requires an API key per-server then use this, do ["server_id"]: "API_KEY" */
    keys?: APIKeys;
    api: {
        /** 
         * Used for adding the headers to the request.
         */
        headers?: Record<string, string>;

        query?: Record<string, string>;

        /**
         * The request method to use (default: GET)
         */
        method?: RequestMethod;

        /**
         * The verification page for this service (if they have one, ex: https://rocord.superchiefyt.xyz)
         */
        verifyPage?: string;

        /**
         * The endpoint to use to fetch the roblox Id from (use %DISCORD_ID% for the user's Discord ID to search for)
         */
        endpoint: string;

        /**
         * field name is where the roblox ID is located at for this service. (example: robloxId or data.id or data.roblox.id)
         */
        fieldName: string;
    }
}, {
    execute(discordId: string, guildId?: string): Promise<RobloxServiceDataHandlerCustom> | RobloxServiceDataHandlerCustom;
}>

export interface RobloxParsedGroupResponse {
    name: string;
    id: number;
    role_id: number;
    rank: number;
    role: string;
    members: number,
    url: `https://roblox.com/groups/${string}`,
    primary: boolean,
    owner: Nullable<UserRoleGroup['owner']>;
    shout: Nullable<{}>
}

export type StrNum = string | number;

export type RobloxServicesOptions = Partial<{ guildId: string, service: string, groups: boolean }>;

//------  ROBLOX TYPES  ------//

export interface RobloxResponse {
    service: string,
    basic: false,
    user: {
        username: string,
        id: number,
        online: 'Offline',
        url: `https://roblox.com/users/${string}/profile`,
        avatar: string,
        bio: string,
        joined: {
            full: string,
            format: string,
        },
        lastnames: [],
        counts: {
            friends: number,
            followers: number,
            following: number,
        }
    },
    groups: RobloxParsedGroupResponse[],
    activity: Nullable<UserPresence>,
}


export interface RobloxUserInfoResponse extends BasicRobloxResponse {
    avatar: string;
    friends: number;
    followers: number;
    following: number;
}

export interface RobloxUserPresences {
    userPresences: UserPresence[]
}

export type UserPresence = {
    userId: number;
    userPresenceType: number;

    /** REQUIRES ROBLOX COOKIE TO BE ANYTHING OTHER THAN 'Website' or empty string */
    lastLocation: string;
    /** REQUIRES ROBLOX COOKIE */
    placeId: Nullable<number>;
    /** REQUIRES ROBLOX COOKIE */
    rootPlaceId: Nullable<number>;
    /** REQUIRES ROBLOX COOKIE */
    gameId: Nullable<string>;
    /** REQUIRES ROBLOX COOKIE */
    universeId: Nullable<number>;
}

export type RobloxOptions = {
    avatar: string;
    info: string;
}

export interface RawBasicRobloxResponse {
    name: string;
    displayName: string;
    id: number;
    hasVerifiedBadge: boolean;
    externalAppDisplayName: string | null;
    isBanned: boolean;
    created: string;
    description: string;
}

export interface BasePostUsersAPIResponse {
    name: string;
    displayName: string;
    id: number;
    hasVerifiedBadge: boolean;
}

export interface POSTUsersAPIResponseWithId {
    data: BasePostUsersAPIResponse[];
}

export type UserSearchResponse = BasePostUsersAPIResponse & {
    requestedUsername: string;
};

export interface POSTUsersAPIResponseWithSearch {
    data: UserSearchResponse[]
}
export type AnyPOSTUsersAPIResponse = XOR<POSTUsersAPIResponseWithId, POSTUsersAPIResponseWithSearch>;

export interface BasicRobloxResponse {
    name: string;
    display: string;
    displayExternal: Nullable<string>;
    id: number;
    verified: boolean;
    banned: boolean;
    created: string;
    description: string;
}


export interface RobloxSearchResponse {
    previousPageCursor: string | null;
    nextPageCursor: string | null;
    data: {
        name: string;
        displayName: string;
        id: number;
        hasVerifiedBadge: boolean;
        previousUsernames: string[]
    }[]
}

export interface RobloxUserGroupRolesResponse {
    data: {
        group: UserRoleGroup,
        role: UserRole,
        isPrimaryGroup?: boolean,
    }[]
}

export type UserRole = {
    name: string;
    id: number;
    rank: number;
}

export type UserRoleGroup = {
    id: number;
    name: string;
    description: string;
    owner: {
        username: string;
        displayName: string;
        userId: number;
        hasVerifiedBadge: boolean;
    };
    shout: Nullable<{}>;
    memberCount: number;
    isBuildersClubOnly: boolean;
    publicEntryAllowed: boolean;
    hasVerifiedBadge: boolean;
}