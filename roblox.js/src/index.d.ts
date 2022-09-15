declare module "@elara-services/roblox.js" {

    // @ts-ignore
    import { User } from "discord.js";

    export interface RobloxOptions {
        cookie?: string;
        debug?: boolean;
        avatarUrl?: string;
        apis?: { rover?: boolean; bloxlink?: boolean; rowifi?: boolean};
        keys?: { bloxlink: string; }
    }

    export interface RobloxStatus {
        status: boolean;
        message?: string;
    }

    export interface RobloxJSEvents {
        on(event: "fetch", listener: (user: string, service: string) => void): void;
        on(event: "failed", listener: (user: string, service: string) => void): void;
    }

    export type VerificationServices = 'RoVer' | 'BloxLink' | 'RoWifi';

    export interface Messages {
        ERROR(str: string): string;
        FETCH_ERROR(err: Error): string;

        ROVER: string;
        BLOXLINK: string;
        ROWIFI: string;
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
        AUTHOR(user: User|string): { name: string, icon_url: string, url: string };
        FOOTER(warn: boolean): { text: string };
    }

    type Response = Promise<RobloxStatus|object|null>;
    // @ts-ignore
    export = class Roblox {
        public constructor(options?: RobloxOptions);
        public rover: boolean;
        public bloxlink: boolean;
        public rowifi: boolean;
        public debug: boolean;
        public keys: { bloxlink?: string | null, rover?: string | null }
        public options: RobloxOptions;
        public events: RobloxJSEvents;
        public isVerifed(user: string|number): Promise<boolean>;
        public fetch(user: string|number, basic?: boolean, guildId?: string, includeBloxLink?: boolean): Promise<RobloxStatus|object>;
        public get(user: string|number, basic?: boolean, guildId?: string, includeBloxLink?: boolean): Promise<RobloxStatus|object>;
        public fetchByUsername(name: string, basic?: boolean): Response;
        public fetchRoVer(id: string, basic?: boolean, guildId?: string, includeBloxLink?: boolean): Response;
        public fetchBloxLink(id: string, basic?: boolean, guildId?: string): Response;
        public fetchRoWifi(id: string, basic?: boolean): Response;
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
        private privateGet(url: string): Promise<object|null>;
        private emit(event: string, ...args: any[]): void;

    }
}