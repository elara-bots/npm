import type {
    ActionRowBuilder,
    AnyComponentBuilder,
    EmbedBuilder,
} from "@discordjs/builders";
import type { RawFile } from "@discordjs/rest";
import type { APIActionRowComponent, APIMessageActionRowComponent, APIUser } from "discord-api-types/v10";
import { APIEmbed, User } from "discord.js";
import { XOR } from "ts-xor";

export type ButtionIdsFunc = (users: (User|{ id: string; })[], db?: any) => unknown[];

export interface sendOptions {
    content?: string | null;
    flags?: number;
    embeds?: EmbedBuilder[] | APIEmbed[];
    components?: ActionRowBuilder<AnyComponentBuilder>[];
    webhook?: {
        name?: string | null;
        icon?: string | null;
        id?: string | null;
        token?: string | null;
    };
    files?: RawFile[]
    allowed_mentions?: {
        parse?: string[];
        roles?: string[];
        users?: string[];
    }
}

export type FetchWebhookInfoOption = {
    name?: string | null;
    icon?: string | null;
} | null | undefined;

export interface CachedChannel {
    id: string;
    invalid: boolean;
    type: number;
    guildId?: string;
    parentId?: string;
    guild?: CachedGuild | null
}

export interface CachedClient {
    id: string;
    invalid: boolean;
    user?: Pick<APIUser, "username" | "avatar" | "discriminator">
}

export type CachedOptionType = "channels" | "webhooks" | "guilds" | "client";

export type CachingData = XOR<CachedChannel, CachedWebhook, CachedGuild, CachedClient>;

export interface CachedGuild {
    invalid: boolean;
    id: string;
    name?: string | null;
    icon?: string | null;
}

export interface CachedWebhook {
    id: string;
    token: string;
}

export interface DiscordWebhookOptions {
    username?: string;
    avatar_url?: string;
    threadId?: string;
}

export interface DiscordWebhookData {
    flags?: number;
    username?: string;
    avatar_url?: string;
    content?: string;
    embeds: APIEmbed[];
    components: APIActionRowComponent<APIMessageActionRowComponent>[];
    thread_id?: string;
    allowed_mentions: sendOptions['allowed_mentions'];
    files: RawFile[]
}