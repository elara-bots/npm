declare module "elara-services" {

    interface Status {
        status: boolean,
        message: string
    }


    class Services {
        public constructor(key: string, baseURL?: string);
        private key: string;
        private fetch(url: string, body?: object|undefined, useKey?: boolean, useBase?: boolean): Promise<object|null>;
        private send(message: string, status?: boolean): { status: boolean, message: string };
        public baseURL: string;
        public support: string;
        public docs: string;
        public ping(): Promise<{ status: boolean, time: number }|Status>
    
        public haste: {
            get(id: string, url?: string): Promise<object|Status>;
            post(content: string, options?: { url?: string, extension?: string }): Promise<{ status: boolean, id: string, url: string }|Status>;
        };

        public paste: {
            get(id: string): Promise<object|Status>;
            post(title?: string, content?: string, privatePaste?: boolean): Promise<object|Status>;
        };

        public api: {
            dbl: {
                get(token: string, id: string): Promise<object|Status>;
                post(token: string, id: string, servers: number, shards?: number): Promise<object|Status>;
            };
            photos(image: string): Promise<object|Status>;
            math(problem: string): Promise<object|Status>;
            special(image: string): Promise<object|Status>;
            translate(to: string, text: string): Promise<object|Status>;
            invites(type?: string): Promise<object|Status>;
            facts(type: string): Promise<object|Status>;
            memes(clean?: boolean): Promise<object|Status>;
            ball(): Promise<object|Status>;
            dogbreed(type: string, breed: string): Promise<object|Status>;
            npm(name: string): Promise<object|Status>;
            time(place: string, all?: boolean): Promise<object|Status>;
            docs(search: string, project?: string, branch?: string): Promise<object|Status>;
            platform: {
                ytstats(token: string, IDOrName): Promise<object|Status>;
                twitch(token: string, name: string): Promise<object|Status>;
                roblox(id: string): Promise<object|Status>;
                robloxgroup(id: string): Promise<object|Status>;
                fortnite(token: string, name: string, platform?: string): Promise<object|Status>;
                paladins(devID: string, auth: string, username: string, platform?: string): Promise<object|Status>;
                imdb(token: string, show: string): Promise<object|Status>;
                ytsearch(token: string, name: string, type?: string): Promise<object|Status>;
                picarto(nameOrID: string): Promise<object|Status>;
            }
        };

        public automod: {
            images(token: string, urls: string[], percent?: number): Promise<object|Status>;
            words(message: string, words: string[], emojis?: string[]): Promise<object|Status>;
            links(message: string, options?: { prefix?: string, regexp?: boolean }): Promise<object|Status>;
        };

        public dev: {
            blacklists: {
                servers(id?: string, type?: string, data?: { name: string, reason: string, mod: string }): Promise<object|Status>;
                users(id?: string, type?: string, data?: { username: string, tag: string, reason: string, mod: string }): Promise<object|Status>;
            }
        }
    }
    
    export = Services;
}