import { APIModalActionRowComponent, APISelectMenuOption, ComponentType } from "discord-api-types/v10";

export type ButtonStyles = 'PRIMARY' | 'BLURPLE' | 'SECONDARY' | 'GREY' | 'SUCCESS' | 'GREEN' | 'DANGER' | 'RED' | 'LINK' | 'URL';

export type ButtonNumberStyles = 1 | 2 | 3 | 4 | 5;

export interface ButtonOptions {
    type?: number;
    style?: ButtonNumberStyles | ButtonStyles;
    emoji?: { name?: string | null, id?: string | null, animated?: boolean };
    disabled?: boolean;
    id?: string;
    title?: string;
    custom_id?: string;
    label?: string;
    url?: string;
}
export interface SelectOptions { 
    id?: string;
    custom_id?: string;
    holder?: string;
    placeholder?: string;
    min?: number;
    max?: number;
    max_values?: number;
    min_values?: number;
    type?: ComponentType.ChannelSelect | ComponentType.MentionableSelect | ComponentType.RoleSelect | ComponentType.StringSelect | ComponentType.UserSelect;
    disabled?: boolean;
    options?: APISelectMenuOption[]
}
export interface ModalOptions {
    title?: string;
    label?: string;
    custom_id?: string;
    id?: string;
    components: {
        type: 1 | ComponentType.ActionRow,
        components: APIModalActionRowComponent[]
    }[]
}

export interface TextInputOptions {
    type?: ComponentType.TextInput | 4;
    id?: string;
    custom_id?: string;
    title?: string;
    label?: string;
    style?: 1 | 2;
    min?: number;
    max?: number;
    max_length?: number;
    min_length?: number;
    placeholder?: string;
    holder?: string;
    required?: boolean;
    value?: string;
}

export interface Slash {
    type?: number;
    dm_permission?: boolean;
    dmPermission?: boolean;
    defaultMemberPermissions?: string;
    default_member_permissions?: string;
    options?: unknown[];
    locale?: {
        names?: Record<string, string>;
        descriptions?: Record<string, string>;
    }
}
export type ChannelTypes = 'GUILD_TEXT' | 'DM' | 'GUILD_VOICE' | 'GROUP_DM' | 'GUILD_CATEGORY' | 'GUILD_NEWS' | 'GUILD_STORE' | 'GUILD_NEWS_THREAD' | 'GUILD_PUBLIC_THREAD' | 'GUILD_PRIVATE_THREAD' | 'GUILD_STAGE_VOICE';

export interface SlashOptions {
    type: number;
    name: string;
    description: string;
    required?: boolean;
    channel_types?: ChannelTypes[];
    autocomplete?: boolean;
    min_value?: number;
    max_value?: number;
    min_length?: number;
    max_length?: number;
    choices?: { name: string, value: string }[];
    options?: SlashOptions[];
    locale?: {
        names?: Record<string, string>;
        descriptions?: Record<string, string>;
    }
}