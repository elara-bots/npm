declare module "discord-hook" {

    type Component = {
        type: number;
        components: Button[];
    };

    type ButtonStyle = 'Primary' | 'Secondary' | 'Success' | 'Danger' | 'Link'

    type Button = {
        type: number;
        style: ButtonStyle|number;
        custom_id?: string;
        label?: string;
        disabled?: boolean;
        url?: string;
        emoji?: { name?: string, id?: string, animated?: boolean };
    };

    type Embed = {
        title?: string;
        description?: string;
        color?: string|number;
        fields?: { name?: string, value?: string, inline?: boolean }[];
        footer?: { text?: string, icon_url?: string };
        author?: { name?: string, icon_url?: string, url?: string };
        timestamp?: Date|string;

    };

    class Webhook {
        public constructor(url: string, options?: { username?: string, avatar_url?: string, threadId?: string });
        private url: string;
        public helpers: {
            blank: string;
        };
        private data: {
            username: string;
            avatar_url: string;
            content: string;
            embeds: Embed[];
            components: Component[];
            thread_id: string;
        };
        public author(username?: string, avatar?: string): this;
        public content(text: string): this;
        public mention(text: string): this;
        public embeds(embeds: Embed[]): this;
        public embed(embed: Embed): this;
        /** NOTE: Components only works on webhooks owned by bots/applications */
        public button(data: Component): this;
        /** NOTE: Components only works on webhooks owned by bots/applications */
        public buttons(data: Component[]): this;
        public field(name?: string, value?: string, inline?: boolean): { name: string, value: string, inline: boolean };
        public send(force?: boolean, authorization?: string): Promise<any>;
        public edit(messageID: string): Promise<any>;
        /**
        * @deprecated This method is deprecated, use the '.author("Name", "Avatar_URL")' method!
        */
        public both(username: string, avatar: string): this;
        /**
        * @deprecated This method is deprecated, use the '.author("Name", "Avatar_URL")' method!
        */
        public username(name: string): this;
        /**
        * @deprecated This method is deprecated, use the '.author("Name", "Avatar_URL")' method!
        */
        public avatar(url: string): this;
    };

    export = Webhook;
};
