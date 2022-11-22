declare module "@elara-services/reddit" {
    import { EventEmitter } from "events";
    export type ResponseType = Promise<object|string|Error>

    export class Reddit {
        public constructor(); 
        private emitter: EventEmitter;
        public announced: Set<string>;
        public data: { users: Set<string>, subs: Set<string> };
        public searchTime: { users: number, subs: number };
        public enabled: { users: boolean, subs: boolean };
        public listen(event: 'user', listener: (user: string, post: object) => void): this;
        public listen(event: 'subreddit', listener: (sub: string, post: object) => void): this;
        public listen(event: 'searching', listener: (list: string[], type: 'user' | 'subreddit') => void): this;
        public setSearch(minutes: number, type: 'subs' | 'users'): this;
        public setEnabled(bool: boolean, type: 'subs' | 'users'): this;
        public users: {
            add(name: string, skipValidator?: boolean): ResponseType;
            remove(name: string, skipValidator?: boolean): ResponseType;
            list(): string[];
            bulk(names: string[], skipValidator?: boolean): Reddit;
        };

        public subs: {
            add(name: string, skipValidator?: boolean): ResponseType;
            remove(name: string, skipValidator?: boolean): ResponseType;
            list(): string[];
            bulk(names: string[], skipValidator?: boolean): Reddit;
        };

        public run(): Promise<void>;
    }

    export class util extends null {
        static fetchPosts(endpoint: string, limit?: number, sort?: string): Promise<any[]>;
        static isValid(name: string, type?: 'r' | 'user' | 'u'): Promise<{ status: boolean, message?: string, data?: object }>;
        static time(date: string | Date, format?: 'm' | string, parse?: boolean): number | string;
    }
}