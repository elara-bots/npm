declare module "@elara-services/roblox.js" {

    export interface RobloxOptions {
        cookie?: string;
        debug?: boolean;
        avatarUrl?: string;
        apis?: { rover?: boolean; bloxlink?: boolean; };
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

    type Response = Promise<RobloxStatus|object|null>;
    // @ts-ignore
    export = class Roblox {
        public constructor(options?: RobloxOptions);
        public rover: boolean;
        public bloxlink: boolean;
        public debug: boolean;
        public keys: { bloxlink?: string | null }
        public options: RobloxOptions;
        public events: RobloxJSEvents;
        public isVerifed(user: string|number): Promise<boolean>;
        public fetch(user: string|number, basic?: boolean, guildId?: string): Promise<RobloxStatus|object>;
        public get(user: string|number, basic?: boolean, guildId?: string): Promise<RobloxStatus|object>;
        public fetchByUsername(name: string): Response;
        public fetchRover(id: string, basic?: boolean, guildId?: string): Response;
        public fetchBloxlink(id: string, basic?: boolean, guildId?: string): Response;
        public fetchBasicRobloxInfo(id: string): Response | Promise<{
            status: boolean;
            description: string;
            created: string;
            isBanned: boolean;
            externalAppDisplayName: string|null;
            id: number;
            name: string;
            displayName: string
        }>;
        public fetchRoblox(id: string|number): Response;
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