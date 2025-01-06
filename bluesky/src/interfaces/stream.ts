import {
    APIActionRowComponent,
    APIEmbed,
    APIMessageActionRowComponent,
} from "discord-api-types/v10";
import { ObjectId } from "mongodb";
import { APIOptions } from ".";

export interface StreamOptions extends APIOptions {
    searchMinutes?: number;
}

export interface StreamUserOption {
    handle: string;
    channels?: StreamUserOptional[];
}

export interface SetStreamUserOption {
    _id?: ObjectId;
    handle: string;
    channels: StreamUserOptions[];
}

export interface StreamUserOptions {
    searchId: string;
    channelId: string | null | undefined;
    guildId: string;
    url: string | null | undefined;
    roles: string[];
    color: string;
    showButtons: boolean;
    options: {
        username: string | null;
        avatar: string | null;
        content: string;
        embeds: APIEmbed[];
        components: APIActionRowComponent<APIMessageActionRowComponent>[];
    };
    toggles: {
        reposts: boolean;
    };
}

export interface StreamUserOptional {
    searchId?: string;
    url?: string | null;
    channelId?: string | null;
    guildId: string;
    roles?: string[];
    color?: string;
    showButtons?: boolean;
    options?: {
        username?: string | null;
        avatar?: string | null;
        content?: string | null;
        embeds?: APIEmbed[];
        components?: APIActionRowComponent<APIMessageActionRowComponent>[];
    };
    toggles?: {
        reposts?: boolean;
    };
}

export interface FormattedStreamPost {
    links: {
        url: string;
        uri: string;
        cid: string;
    };
    text: string;
    images: string[];
    type: "post" | "repost";
    media: unknown[];
    createdAt: string;
    author: {
        handle: string;
        username: string;
        avatar: string | null;
        id: string;
    };
    counts: {
        likes: number;
        replies: number;
        reposts: number;
    };
    reposted: {
        createdAt: string;
        user: {
            username: string;
            handle: string;
            avatar: string;
            id: string;
        };
    } | null;
}
