import type {
    ActionRowBuilder,
    AnyComponentBuilder,
    EmbedBuilder,
} from "@discordjs/builders";
import type { RawFile } from "@discordjs/rest";
import type { APIActionRowComponent, APIMessageActionRowComponent } from "discord-api-types/v10";
import { APIEmbed } from "discord.js";

export interface sendOptions {
    content?: string | null;
    embeds?: EmbedBuilder[] | APIEmbed[];
    components?: ActionRowBuilder<AnyComponentBuilder>[];
    disableMentions?: string | "all";
    webhook?: {
        name?: string | null;
        icon?: string | null;
    };
    files?: RawFile[]
    allowed_mentions?: {
        parse?: string[];
        roles?: string[];
        users?: string[];
    }
}

export interface CachedChannel {
    id: string;
    invalid: boolean;
    type: number;
    guildId?: string;
    parentId?: string;
}

export type CachedOptionType = "channels" | "webhooks";

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
    username: string | undefined;
    avatar_url: string | undefined;
    content: string | undefined;
    embeds: APIEmbed[];
    components: APIActionRowComponent<APIMessageActionRowComponent>[];
    thread_id: string | undefined;
    allowed_mentions: sendOptions['allowed_mentions'];
}