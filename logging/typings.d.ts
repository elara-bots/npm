
declare module "@elara-services/logging" {
    import { AutoModerationRule, Channel, Client, ClientEvents, Emoji, Guild, GuildMember, GuildScheduledEvent, Invite, Message, StageChannel, Sticker, ThreadChannel, User, VoiceState, Webhook, WSEventType } from "discord.js";
    import { EventEmitter } from "node:events";

    export type Changes = { name: string, value: any }[];

    export type LoggerOptions = {
        logbots?: boolean;
        messages: {
            type: 'mongodb' | 'cache',
            /* The mongodb connection URI */
            uri?: string,
            /* The number of days to store the messages (ONLY FOR MONGODB, MIN: 1 Day, MAX: 30 Days) */
            stored?: number,
            /* The encryption key for the message content being stored (REQUIRED FOR MONGODB, DO NOT CHANGE THE KEY AFTER SETTING IT, OR ALL MESSAGES STORED CANNOT BE DECRYPTED) */
            aesKey?: string,
        }
    }

    export type MongodbMessage = {
        id: string;
        type: string;
        channelID: string;
        guildID: string;
        author: string;
        content: string;
        reply: string;
        attachments: string[],
        emojis: string[];
        stickers: string[];
        createdAt: string;
        expire: string;
    }

    export type BaseEventOptions = { 
        name: keyof ClientEvents | WSEventType,
        enabled?: boolean,
        emitter?: 'client' | 'ws';
    }

    export type AnyMessage = MongodbMessage | Message<true>;

    export class Logger extends EventEmitter {
        public constructor(client: Client, options: LoggerOptions);

        public client: Client;
        public options: LoggerOptions;

        public on(event: 'channelCreate', listener: (channel: Channel, changes: Changes) => void): this;
        public on(event: 'channelDelete', listener: (channel: Channel, changes: Changes) => void): this;
        public on(event: 'channelUpdate', listener: (channel: Channel, changes: Changes) => void): this;
        
        public on(event: 'guildMemberAdd', listener: (member: GuildMember, changes: Changes) => void): this;
        public on(event: 'guildMemberRemove', listener: (member: GuildMember, changes: Changes) => void): this;
        public on(event: 'guildMemberUpdate', listener: (oldMember: GuildMember, member: GuildMember, changes: Changes) => void): this;
        public on(event: 'guildMemberKick', listener: (member: GuildMember, changes: Changes) => void): this;
        public on(event: 'guildMemberVerify', listener: (member: GuildMember, changes: Changes) => void): this;
        
        public on(event: 'guildBanAdd', listener: (user: User, changes: Changes) => void): this;
        public on(event: 'guildBanRemove', listener: (user: User, changes: Changes) => void): this;
        public on(event: 'guildUpdate', listener: (oldGuild: Guild, guild: Guild, changes: Changes) => void): this;
        
        public on(event: 'autoModerationRuleCreate', listener: (rule: AutoModerationRule, changes: Changes) => void): this;
        public on(event: 'autoModerationRuleDelete', listener: (rule: AutoModerationRule, changes: Changes) => void): this;
        public on(event: 'autoModerationRuleUpdate', listener: (oldRule: AutoModerationRule, rule: AutoModerationRule, changes: Changes) => void): this;

        public on(event: 'roleCreate', listener: (role: Role, changes: Changes) => void): this;
        public on(event: 'roleDelete', listener: (role: Role, changes: Changes) => void): this;
        public on(event: 'roleUpdate', listener: (oldRole: Role, role: Role, changes: Changes) => void): this;

        public on(event: 'emojiCreate', listener: (emoji: Emoji, changes: Changes) => void): this;
        public on(event: 'emojiDelete', listener: (emoji: Emoji, changes: Changes) => void): this;
        public on(event: 'emojiUpdate', listener: (oldEmoji: Emoji, emoji: Emoji, changes: Changes) => void): this;

        public on(event: 'threadCreate', listener: (thread: ThreadChannel, changes: Changes) => void): this;
        public on(event: 'threadDelete', listener: (thread: ThreadChannel, changes: Changes) => void): this;
        public on(event: 'threadCreate', listener: (oldThread: ThreadChannel, thread: ThreadChannel, changes: Changes) => void): this;
        
        public on(event: 'voiceStateUpdate', listener: (oldVoice: VoiceState, voice: VoiceState, changes: Changes) => void): this;

        public on(event: 'stickerCreate', listener: (sticker: Sticker, changes: Changes) => void): this;
        public on(event: 'stickerDelete', listener: (sticker: Sticker, changes: Changes) => void): this;
        public on(event: 'stickerUpdate', listener: (oldSticker: Sticker, sticker: Sticker, changes: Changes) => void): this;

        public on(event: 'guildScheduledEventCreate', listener: (event: GuildScheduledEvent, changes: Changes) => void): this;
        public on(event: 'guildScheduledEventDelete', listener: (event: GuildScheduledEvent, changes: Changes) => void): this;
        public on(event: 'guildScheduledEventUpdate', listener: (oldEvent: GuildScheduledEvent, event: GuildScheduledEvent, changes: Changes) => void): this;

        public on(event: 'guildScheduledEventUserAdd', listener: (event: GuildScheduledEvent, user: User, changes: Changes) => void): this;
        public on(event: 'guildScheduledEventUserRemove', listener: (event: GuildScheduledEvent, user: User, changes: Changes) => void): this;

        public on(event: 'stageInstanceCreate', listener: (stage: StageChannel, changes: Changes) => void): this;
        public on(event: 'stageInstanceDelete', listener: (stage: StageChannel, changes: Changes) => void): this;
        public on(event: 'stageInstanceUpdate', listener: (oldStage: StageChannel, stage: StageChannel, changes: Changes) => void): this;


        public on(event: 'webhookCreate', listener: (webhook: Webhook, changes: Changes) => void): this;
        public on(event: 'webhookDelete', listener: (webhook: Webhook, changes: Changes) => void): this;
        public on(event: 'webhookUpdate', listener: (oldWebhook: Webhook, webhook: Webhook, changes: Changes) => void): this;

        public on(event: 'inviteCreate', listener: (invite: Invite, changes: Changes) => void): this;
        public on(event: 'inviteDelete', listener: (oldInvite: Invite, invite: Invite, changes: Changes) => void): this;

        public on(event: 'userUpdate', listener: (oldUser: User, user: User, changes: Changes) => void): this;

        public on(event: 'messageDelete', listener: (message: AnyMessage, changes: Changes) => void): this;
        public on(event: 'messageUpdate', listener: (oldMessage: AnyMessage, message: AnyMessage, changes: Changes) => void): this;
        public on(event: 'messageDeleteBulk', listener: (messages: AnyMessage[], changes: Changes) => void): this;

    }

}