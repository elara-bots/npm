declare module "@elara-services/tickets" {
    
    import type { Client, MessageOptions, GuildMember, Guild, User, TextBasedChannel, Message, Interaction } from "discord.js";

    export type Langs = "en-US";

    export interface TicketOptions {
        client: Client;
        prefix: string;
        encryptToken: string;
        lang?: Langs;
        debug?: boolean;
        appeals?: {
            enabled?: boolean;
            sendBanResults?: boolean;
            mainserver: {
                id: string;
                checkIfBanned?: boolean;
            };
            embeds?: {
                not_banned: Pick<MessageOptions, "content" | "embeds" | "components">
            }
        };
        modal?: {
            enabled?: boolean;
            title?: string;
            questions?: {
                label: string;
                style: 1 | 2;
                placeholder?: string;
                value?: string;
                required?: boolean;
                min_length?: number;
                max_length?: number;
            }[]
        };
        webhook?: {
            id?: string;
            token?: string;
            threadId?: string;
            username?: string;
            avatar?: string
        };
        support?: {
            roles?: string[];
            users?: string[];
            canOnlyCloseTickets?: boolean;
            ignore?: string[]
        };
        ticket?: {
            category?: string;
            closeReason?: boolean;
            supportCommentThread?: boolean;
            limitOnePerUser?: boolean;
            open?: Pick<MessageOptions, "content" | "embeds">
            close?: {
                confirm?: Pick<MessageOptions, "content" | "embeds">
            }
        }
    }

    interface LangFile {
        NO_BAN_PERMS_USER_IN_APPEAL_SERVER(server: Guild): string;
        NOT_FOUND_IN_APPEAL_SERVER(server: Guild): string;
        TICKET_LIMIT_ONE_PER_USER(name: string): string;
        NO_CONSTRUCTOR_OPTIONS(name?: string): string;
        NO_CHANNEL_FOUND(id: string): string;
        USER_NOT_BANNED(id: string): string;
        UNBAN_FAILED(id: string, serverName: string): string;
        UNBAN_SUCCESS(id: string, serverName: string): string;
        ID(id?: string): string;

        OPEN_TICKET_MESSAGE_CONTENT: string;
        TICKET_CLOSE_CONFIRM_BUTTON: string;
        OPEN_TICKET_MESSAGE_FOOTER: string;
        MODAL_CONTENT_PLACEHOLDER: string;
        CLOSE_TICKET_FIELD_REASON: string;
        OPEN_TICKET_AUDIT_REASON: string;
        TICKET_CLOSE_PLACEHOLDER: string;
        NO_APPEAL_SERVER_FOUND: string;
        NOT_BANNED_MAIN_SERVER: string;
        TICKET_CLOSE_CONFIRM: string;
        NO_MESSAGES_FETCHED: string;
        OPEN_TICKET_MESSAGE: string;
        OPEN_TICKET_CREATE: string;
        CLOSE_TICKET_TITLE: string;
        OPEN_TICKET_TITLE: string;
        NO_CHANNEL_CREATE: string;
        NO_CHANNEL_DELETE: string;
        NO_BAN_PERMS_USER: string;
        TICKET_BLOCKED: string;
        FORM_RESPONSES: string;
        NO_USER_FOUND: string;
        CREATE_TICKET: string;
        CLOSED_TICKET: string;
        FORM_RESPONSE: string;
        MODAL_CONTENT: string;
        ONLY_SUPPORT: string;
        GO_TO_TICKET: string;
        CLOSE_TICKET: string;
        BAN_REASON: string;
        UNBAN_FROM: string;
        TRANSCRIPT: string;
        TICKET_ID: string;
        VIEW_HERE: string;
        NO_REASON: string;
        CLOSED_BY: string;
        UNBANNED: string;
        TICKETS: string;
        CHANNEL: string;
        REASON: string;
        UNBAN: string;
        ERROR: string;
        USER: string;
        INFO: string;
        BY: string;
    }

    class Tickets {
        public constructor(options: TicketOptions);
        public options: TicketOptions;
        public prefix: string;

        private _debug(...args: unknown[]): unknown;

        public get webhookOptions(): {
            id: string | undefined;
            token: string | undefined;
            threadId: string | undefined;
            username: string;
            avatar: string;
        };

        public get getSupportIds(): {
            roles: string[];
            users: string[];
        };

        public str(name: keyof LangFile, lang?: Langs): string;

        public button(options: { style: 1 | 2 | 3 | 4 | 5 | number, id?: string, label?: string, emoji?: { name?: string, id?: string } }): { type: number, custom_id: string, style: number, label?: string, emoji?: { name?: string, id?: string } }
        public closeTicket(options: {
            member: GuildMember,
            guild: Guild, 
            user: User,
            messages: Message[],
            channel: TextBasedChannel
        }): Promise<unknown>;

        public run(int: Interaction): Promise<unknown>;
        public runMany(interaction: Interaction, tickets: Tickets[]): this;
        public starterMessage(channelId: string, options?: Pick<MessageOptions, "embeds" | "content" | "components" | "attachments">): Promise<unknown>;
    };

    export = Tickets;
}