declare module "@elara-services/tickets" {
    
    import { Client, MessageOptions, GuildMember, Guild, User, TextBasedChannel, Message, Interaction, ModalOptions } from "discord.js";
    import Webhook from "discord-hook";

    export interface TicketOptions {
        client: Client;
        prefix: string;
        debug?: boolean;
        encryptToken: string;
        appeals?: {
            enabled: boolean;
            sendBanResults?: boolean;
            mainserver: {
                id: string;
                checkIfBanned: boolean;
            };
            embeds?: {
                not_banned: Pick<MessageOptions, "content" | "embeds" | "components">
            }
        };
        modal?: {
            enabled: boolean;
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
            limitOnePerUser?: boolean;
            open?: Pick<MessageOptions, "content" | "embeds">
        }

        /** @deprecated Use 'ticket.category', 'ticketCategory' will be removed in the next major version */
        ticketCategory?: string;
        /** @deprecated Use 'ticket.open', 'ticketOpen' will be removed in the next major version */
        ticketOpen?: Pick<MessageOptions, "content" | "embeds">

        // reports?: {
        //     enabled: boolean;
        //     shouldBeTicket?: boolean;
            
        // }
    }

    class Tickets {
        public constructor(options: TicketOptions);
        public options: TicketOptions;
        public prefix: string;
        public webhook(): typeof Webhook.prototype;
        public button(options: { style: 1 | 2 | 3 | 4 | 5 | number, id?: string, label?: string, emoji?: { name?: string, id?: string } }): { type: number, custom_id: string, style: number, label?: string, emoji?: { name?: string, id?: string } }
    
        public fetchMessages(channel: TextBasedChannel, limit?: number, before?: string, after?: string, around?: string): Promise<Array<Message>>
        public displayMessages(channel: TextBasedChannel, messages: Array<Message>, ticketID: string, type: string): string;
        public closeTicket(options: {
            member: GuildMember,
            guild: Guild, 
            user: User,
            messages: Array<Message>,
            channel: TextBasedChannel
        }): Promise<void>;

        public code(id: string, type: string): string;
        public run(int: Interaction): Promise<void>;
        public starterMessage(channelId: string, options?: Pick<MessageOptions, "embeds" | "content" | "components" | "attachments">): Promise<void>;
    };

    export = Tickets;
}