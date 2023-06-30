import {
    type ActionRowBuilder,
    type AnyComponentBuilder,
    type EmbedBuilder,
} from "@discordjs/builders";
import { type RawFile } from "@discordjs/rest";

export interface sendOptions {
    content?: string | null;
    embeds?: EmbedBuilder[];
    components?: ActionRowBuilder<AnyComponentBuilder>[];
    disableMentions?: string | "all";
    webhook?: {
        name?: string | null;
        icon?: string | null;
    };
    files?: RawFile[]
}

export interface CachedChannel {
    id: string;
    invalid: boolean;
    type: number;
    guildId?: string;
    parentId?: string;
}

export interface CachedWebhook {
    id: string;
    token: string;
}