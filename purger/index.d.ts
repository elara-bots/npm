declare module "@elara-services/purger" {

    import { Message, TextBasedChannel } from "discord.js";

    export type PurgerFilterType = 'text' | 'link' | 'embed' | 'bot' | 'image' | 'you' | 'invite' | 'user' | 'contains' | 'startswith' | 'normal'

    export type PurgerTypeResponse = Promise<number|null>;

    export class Purger {
        public constructor(channel: TextBasedChannel, amount?: number, cmd?: boolean, maxLimit?: number);

        public channel: TextBasedChannel;
        public amount: number;
        public cmd: boolean;
        public maxLimit: number;

        public links(amount?: number): PurgerTypeResponse;
        public bots(amount?: number): PurgerTypeResponse;
        public images(amount?: number): PurgerTypeResponse;
        public text(amount?: number): PurgerTypeResponse;
        public embeds(amount?: number): PurgerTypeResponse;
        public client(amount?: number): PurgerTypeResponse;
        public invites(amount?: number): PurgerTypeResponse;
        public user(user: object, amount?: number): PurgerTypeResponse;
        public normal(amount?: number): PurgerTypeResponse;
        public contains(content: string, amount?: number): PurgerTypeResponse;
        public startsWith(content: string, amount?: number): PurgerTypeResponse;
        public init(filter?: PurgerFilterType, user?: object|null, content?: string|null): PurgerTypeResponse;
        private purge(filter?: PurgerFilterType, amount?: number): PurgerTypeResponse;
        private fetch(): Promise<Array<Message>|null>
    }

    export class Utils extends null {
        static fetchMessages(channel: TextBasedChannel, limit?: number, before?: string, after?: string, around?: string): Promise<Array<Message>>;
        static deleteMessages(channel: TextBasedChannel, messageIDs: string[]): Promise<string[]>
    }
}