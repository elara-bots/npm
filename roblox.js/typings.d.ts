declare module "@elara-services/roblox.js" {

    // @ts-ignore
    import { User } from "discord.js";

    export interface IncludeServices {
        rocord?: boolean;
        rover?: boolean;
        rowifi?: boolean;
        bloxlink?: boolean;
    }

    export interface FetchRobloxResponse {
        status: true,
        service?: string;
        user: {
            username: string;
            id: number;
            online: string;
            url: string;
            avatar: string,
            bio: string;
            joined: {
                full: string;
                format: string;
            } | null,
            lastnames: string[];
            counts: {
                friends: number;
                followers: number;
                following: number;
            }
        };

        groups: {
            name: string;
            id: number;
            role_id: string;
            rank: string;
            role: string;
            members: number;
            url: string;
            primary: boolean;
            /** @deprecated this was removed from the groups/role API and will always return false */
            inclan: false;
            /** @deprecated this was removed from the groups/role API and will always return id: 0, url: "" */
            emblem: { id: 0, url: "" };
            owner: object | null;
            shout: object | null;
            raw: object
        }[];
        
        activity: object | null;
    }

    export interface RobloxOptions {
        cookie?: string;
        debug?: boolean;
        avatarUrl?: string;
        apis?: { rover?: boolean; bloxlink?: boolean; rowifi?: boolean; rocord?: boolean; rolinkapp?: boolean };
        keys?: { bloxlink?: string; rocord?: string; rolinkapp?: string  }
    }

    export interface RobloxStatus {
        status: boolean;
        message?: string;
    }

    export interface RobloxJSEvents {
        on(event: "fetch", listener: (user: string, service: VerificationServices) => void): void;
        on(event: "failed", listener: (user: string, service: VerificationServices) => void): void;
    }

    export type VerificationServices = 'RoVer' | 'BloxLink' | 'RoWifi' | 'RoCord' | 'RoLinkApp';

    export interface Messages {
        ERROR(str: string): string;
        FETCH_ERROR(err: Error): string;

        ROCORD: string;
        ROVER: string;
        BLOXLINK: string;
        ROWIFI: string;
        ROLINKAPP: string;
        NO_ROBLOX_PROFILE: string;
        BIO: string;
        STATUS: string;
        URL: string;
        PROFILE: string;
        AVATAR: string;
        ID: string;
        PRIMIARY: string;
        RANK: string;
        ROLE: string;
        LINK: string;
        OFFLINE: string;
        UNKNOWN: string;
        PAST_NAMES: string;
        JOINED: string;
        COUNTS: string;
        FRIENDS: string;
        FOLLOWERS: string;
        FOLLOWING: string;
        GROUPS: string;
        USERNAME: string;
        GAME_URL(url: string): string;
        LAST_SEEN: string;
        ACTIVITY: string;
        NOT_VERIFIED(service: VerificationServices): string;
        DISABLED(service: VerificationServices): string;
        AUTHOR(user: User|string, res: object|null): { name: string, icon_url: string, url: string };
        FOOTER(warn: boolean): { text: string };
    }
    type Response = Promise<RobloxStatus|FetchRobloxResponse|object|null>;
    // @ts-ignore
    export = class Roblox {
        public constructor(options?: RobloxOptions);
        public rover: boolean;
        public bloxlink: boolean;
        public rowifi: boolean;
        public rocord: boolean;
        public rolinkapp: boolean;
        public debug: boolean;
        public keys: { bloxlink?: string | null, rover?: string | null, rocord?: string | null, rolinkapp?: string | null }
        public options: RobloxOptions;
        public events: RobloxJSEvents;
        public isVerifed(user: string|number): Promise<boolean>;
        public services: {
            rocord: (id: string, basic?: boolean) => Promise<Response>;
            rover: (id: string, basic?: boolean) => Promise<Response>;
            rowifi: (id: string, basic?: boolean) => Promise<Response>;
            bloxlink: (id: string, basic?: boolean, guildId?: string, include?: IncludeServices) => Promise<Response>;
            rolinkapp: (id: string, basic?: boolean) => Promise<Response>;
            get: (id: string, basic?: boolean, guildId?: string, include?: IncludeServices) => Promise<Response>;
        }

        public get(user: string|number, basic?: boolean, guildId?: string, include?: IncludeServices): Promise<Response>;
        public fetchByUsername(name: string, basic?: boolean): Response;
        public fetchBasicRobloxInfo(id: string, service?: VerificationServices | string): Response | Promise<{
            status: boolean;
            service: VerificationServices | string;
            description: string;
            created: string;
            isBanned: boolean;
            externalAppDisplayName: string|null;
            id: number;
            name: string;
            displayName: string
        }>;
        public fetchRoblox(id: string|number, service?: VerificationServices | string): Response;
        public showDiscordMessageData(res: object, user?: object, options?: {
            showButtons?: boolean,
            color?: number,
            emoji?: string,
            secondEmoji?: string
        }): {
            embeds: object[],
            components: object[]
        }

        // Private Methods
        private _request(url: string, headers?: object, method?: string, returnJSON?: boolean): Promise<object|string|null>;
        private _debug(...args: any): void;
        private privateFetch(url: string): Promise<object|null>;
        private emit(event: string, ...args: any[]): void;

    }
}