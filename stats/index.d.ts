declare module "@elara-services/stats" {
    type PromiseNullibleObject = Promise<object|null>;
    export class Stats {
        public constructor(url: string, id: string, key: string);
        public commands(options?: { guildID: string, name: string }): void;
        public audit(guildID: string): PromiseNullibleObject;
        public event(event: string): PromiseNullibleObject
        public starts(): PromiseNullibleObject;
        public restarts(): PromiseNullibleObject;
        public vote(): PromiseNullibleObject;
        public shutdowns(): PromiseNullibleObject;
        public events(guild?: string): PromiseNullibleObject;
        public webhooks(): PromiseNullibleObject;
        public messages(guildId: string): PromiseNullibleObject;
        public guilds(join?: boolean): PromiseNullibleObject;
        public client(type: string): PromiseNullibleObject;
        public guild(options: { guildID: string, name: string }): PromiseNullibleObject;
        public getClient(id?: string): PromiseNullibleObject;
        public getGuild(guildID: string, clientID: string): PromiseNullibleObject;
        public getClients(): PromiseNullibleObject;
        public getGuilds(clientId?: string): PromiseNullibleObject;
        private post(url: string, body?: object|null): PromiseNullibleObject;
        private get(url: string): PromiseNullibleObject;

    }
}