declare module "@elara-services/twitter" {
    import { EventEmitter } from "events";
    import { Stream } from "twitter-lite";

    export type SendData = {
        webhook: string | string[];
        username: string;
        avatar_url: string;
        content: string;
        embeds: object[];
        components: object[];
    }
    
    export type TwitterOptions = {
        timeout: number,
        sendDefaultAnnouncement?: boolean,
        consumer_key: string, 
        consumer_secret: string, 
        access_token_key: string, 
        access_token_secret: string
    }

    export type UserData = {
        id: string;
        webhooks: string[];
        color?: string | number;
    }

    export type FetchData = {
        url: string;
        text: string;
        formatedText: string;
        color: string | number;
        timestamp: Date | string,
        avatar: string;
        username: string;
        fullName: string;
        images: string[];
        webhooks: string[];
        raw: object;
    }

    export class Twitter extends EventEmitter {
        public constructor(options: TwitterOptions);
        public sendDefaultAnnouncement: boolean;
        public addUser(options: UserData): this;
        public addUsers(users: UserData[]): this;
        public html(str: string): string;
        public start(): Promise<this>;
        public sendDefault(data: object, find: UserData): Promise<string>;
        public fetchData(data: object, find?: UserData): FetchData | null;
        public fetchUser(screen_name: string): Promise<object>;
        public send(options: SendData): Promise<any>;
        public restartStream(): Promise<string>;

        /** Private fields */

        private data: UserData[];
        private ids: string[];
        private twitter: any;
        private stream: Stream | null;

        /** Public Events */

        public on(event: "stream:start", listener: () => void): this;
        public on(event: "stream:error", listener: (error: Error | null) => void): this;
        public on(event: "stream:restart", listener: () => void): this;
        public on(event: "stream:end", listener: (response: any) => void): this;
        public on(event: "stream:post", listener: (data: object, user: UserData) => void): this;
        public on(event: "webhook:error", listener: (error: Error | null) => void): this;
    }
}