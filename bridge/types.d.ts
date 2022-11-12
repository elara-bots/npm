
declare module "@elara-services/bridge" {
    // @ts-expect-error
    import { Client, Message } from "discord.js";

    export interface BridgeOptions {
        enabled: boolean;
        webhooks: string[];
        username?: string;
        avatarURL?: string;
        includeAllMessages?: boolean;
        showMemberProfile?: boolean;
        channelId?: string;
        categoryId?: string;
    }

    export class Bridge {
        public constructor(client: Client, options: BridgeOptions);
        public client: Client<true>;
        public options: BridgeOptions;
        public run(): Promise<void>;
        private handleRun(Intents: any): Promise<void>;
        private handleMessageCreate(m: Message): Promise<void>;
        private send(urls: string[], message: Message): Promise<void>;
    }
}