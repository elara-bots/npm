
declare module "@elara-services/twitter" {
    import { EventEmitter } from "events";
    import { TwitterApi, TweetStream, UserV2Result, UsersV2Params, TweetV2SingleStreamResult } from "twitter-api-v2";
    import { DiscordWebhookData } from "@elara-services/webhooks";

    export type UserData = {
        name: string;
        webhooks: string[];
        color: string | number;
        ignoreText: string[];
        displayReplyTweet: boolean;
        displayRetweetedTweet: boolean;
        displayQuoteTweet: boolean;
        useLinkButton: boolean;
    }

    export type FormattedData = {
        url: string;
        text: string;
        formatedText: string;
        color: string | number;
        timestamp: Date | string;
        avatar: string;
        username: string;
        fullName: string;
        images: string[];
        webhooks: string[];
        raw?: TweetV2SingleStreamResult
    }

    export type TwitterOptions = {
        BearerToken: string,
        defaultAnnouncements?: boolean,
        updateRulesOnStart?: boolean
    }

    export type sendOptions = {
        webhook: string | string[],
        username?: string;
        avatar_url?: string;
        content?: string;
        embeds?: DiscordWebhookData['embeds'];
        components?: DiscordWebhookData['components'];            
    }

    export class Twitter extends EventEmitter {
        public constructor(options: TwitterOptions);

        public shouldUseButtonLink: boolean;
        public defaultAnnouncements: boolean;
        public updateRulesOnStart: boolean;
        public data: UserData[];
        public twitter: TwitterApi;
        public api: TwitterApi['v2'];
        public stream: TweetStream;

        public updateStreamRules(): Promise<void | Error>;
        public fetchUser(nameOrId: string, isUserId?: boolean, query?: UsersV2Params | null): Promise<UserV2Result>;
        public fetchData(data: TweetV2SingleStreamResult, options: UserData, includeRaw?: boolean): FormattedData | null;
        public sendDefault(data: FormattedData | null, find: UserData, returnOnlyData?: boolean): Promise<{
            webhook: string,
            components: sendOptions['components'],
            embeds: sendOptions['embeds'],
            username: string;
            avatar_url: string
        }[] | void>;

        public addUser(options: UserData): this;
        public addUsers(users: UserData[]): this;
        public html(str: string): string;
        public start(): Promise<void>;
        public send(options: sendOptions): Promise<void>

        public on(event: "stream:start", listener: (data: { start: Date }) => void): void;
        public on(event: "stream:post", listener: (data: TweetV2SingleStreamResult) => void): void;
        public on(event: "stream:reconnect", listener: (data: unknown) => void): void;
        public on(event: "stream:error", listener: (error: unknown) => void): void;
        public on(event: "stream:debug", listener: (data: { t: string, d: unknown }) => void): void;
        public on(event: "stream:raw", listener: (data: { t: string, d: unknown }) => void): void;
        public on(event: "stream:disconnect", listener: (data: unknown) => void): void;
        public on(event: "webhook:error", listener: (error: Error) => void): void;

    }

    export class utils extends null {
        static get tweets(): Tweetv2FieldsParams;
        static get user(): Omit<UsersV2Params, "media.fields" | "poll.fields" | "tweet.fields">;
        static chunk(s: unknown[], c?: number): unknown[];
        static isArray(arr: unknown[], checkIfEmpty?: boolean): boolean;
        static bool(i: unknown, def?: boolean): boolean | unknown;
        static WSEvents: {
            "START": "stream:start";
            "POST": "stream:post";
            "RECONNECT": "stream:reconnect";
            "ERROR": "stream:error";
            "DEBUG": "stream:debug";
            "RAW": "stream:raw";
            "DISCONNECT": "stream:disconnect";
            "WEBHOOK": "webhook:error",
        }
    }
}