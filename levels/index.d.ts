declare module "@elara-services/levels" {
    // @ts-ignore
    import { Client, Message } from "discord.js";

    export type LevelData = {
        level: number;
        role: string;
    }

    export type Data = {
        username: string;
        id: string;
        avatar: string;
        level: number;
    }

    export class Levels {
        public constructor(client: Client | object, url: string, log?: boolean);
        public url: string;
        public client: Client | object;
        public log: boolean;
        public data: Map<string, Data[]>;
        public register(guildId: string, levels: LevelData[], stack?: boolean): Promise<void>;
        private format(data: object): Data;
        public fetch(guildId): Promise<boolean>;
        public updateUser(message: Message): Promise<void>;
    }
}