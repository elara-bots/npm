declare module "@elara-services/automod-dms" {
    import { Client, GuildMember, Interaction } from "discord.js";

    export interface NotifyOptions {
        enabled: boolean,
        selectmenu: boolean,
        role: string;
        users: string[]
    }

    export interface AutoModerationActions {
        enabled: boolean,
        guild_id: string;
        notify: NotifyOptions;
        notifications: NotifyOptions
    }

    export interface AutoModDMNotificationsOptions {
        client: Client,
        actions: AutoModerationActions[]
    }

    export interface AutoModerationActionExecution {
        guild_id: string;
        user_id: string
        rule_id: string;
        channel_id: string;
        message_id: string;
        alert_system_message_id: string;
        content: string;
        matched_keyword: string;
        matched_content: string;
        rule_trigger_type: number;
        action: {
            type: number;
            metadata: {
                channel_id?: string;
                duration_seconds?: number
            }
        },
    }

    export class AutoModDMNotifications {
        public constructor(options: AutoModDMNotificationsOptions);
        public options: AutoModDMNotificationsOptions;
        public run(): Promise<void>;
        private handleAutoModerationAction(data: AutoModerationActionExecution): void;
        private handleInteractions(i: Interaction): void;
        private getSelect(mod: GuildMember, member: GuildMember): object | null;
        private getModal(member: GuildMember, type: string): object;
        private handleNotifications(options: { action: AutoModerationActions, type: string, member: GuildMember }): Promise<void>;
        
    }
}