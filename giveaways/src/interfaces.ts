import { ButtonStyles } from "@elara-services/packages";
import { XOR } from "@elara-services/utils";
import { RESTPostAPIChannelMessageJSONBody } from "discord-api-types/v10";
import {
    ButtonStyle,
    Guild,
    GuildMember,
    MessageCreateOptions,
    TextBasedChannel,
    User,
} from "discord.js";
import { MongoClient, MongoClientOptions, ObjectId } from "mongodb";

export type CollectionNames = "active" | "old" | "settings";

export type Status =
    | { status: true; message?: string }
    | { status: false; message: string };

export type MongoDBOptions = XOR<
    MongoClient,
    {
        url: string;
        options?: MongoClientOptions;
    }
>;

export interface GiveawayFilterOptions {
    user: User;
    member: GuildMember;
    guild: Guild;
    db: GiveawayDatabase;
    channel: TextBasedChannel | null;
}

export type GiveawayFilter = (
    options: GiveawayFilterOptions
) => Promise<Status> | Status;

export interface GiveawayDatabase {
    _id: ObjectId;
    pending: boolean;
    id: string;
    winners: number;
    messageId: string;
    channelId: string;
    guildId: string;
    prize: string;
    start: string;
    end: string;
    users: GiveawayUser[];
    /**
     * @note Overrides the default entries settings.
     */
    entries: Entries[];
    host: {
        id: string;
        mention?: boolean;
    } | null;
    roles: Record<RoleTypes, string[]>;
    won: string[];
    rerolled: string[];
    deleteAfter?: string;
}

export interface AddTemplate {
    name: string;
    guildId: string;
    data: Partial<Omit<GiveawayTemplateData, "guildId">>;
}

export type GiveawayTemplateData = Omit<
    GiveawayDatabase,
    | "_id"
    | "start"
    | "end"
    | "channelId"
    | "id"
    | "messageId"
    | "pending"
    | "users"
    | "deleteAfter"
    | "rerolled"
    | "won"
> & {
    message: CustomMessage;
    button: AddGiveaway["button"];
};

export interface GiveawayTemplate {
    _id: ObjectId;
    name: string;
    guildId: string;
    data: GiveawayTemplateData;
}

export type UpdateTemplateOptions = Partial<
    Omit<GiveawayTemplate, "_id" | "guildId" | "name">["data"]
>;

export type Giveaway<D = void> = GiveawayDatabase & D;

export type OldGiveaway<D = void> = Giveaway<D> & { deleteAfter: string };
export type CustomMessage = Omit<
    RESTPostAPIChannelMessageJSONBody,
    | "message_reference"
    | "tts"
    | "nonce"
    | "attachments"
    | "flags"
    | "sticker_ids"
    | "allowed_mentions"
>;

export interface GiveawaySettings {
    _id: string;
    guildId: string;
    messages: {
        winner: CustomMessage;
        reroll: CustomMessage;
    };
    toggles: {
        hostCanJoin: boolean;
    };
    authorized: {
        channelId: string;
        roles: string[];
        users: string[];
    }[];
    entries: Entries[];
}

export type CollectionFilter = {
    channelId: string;
    filter: GiveawayFilter;
};

export type GiveawaySettingsUpdateData = Omit<
    GiveawaySettings,
    "_id" | "guildId"
>;

export type Entries = {
    amount: number;
    roles: string[];
};

export interface GiveawayUser {
    id: string;
    entries: number;
}

export type RoleTypes = "required" | "add" | "remove";

export interface AddGiveaway {
    channelId: string;
    guildId: string;
    prize: string;
    end: Date | string;
    winners?: number;
    mentions?: {
        id: string;
        type: "role" | "user";
    }[];

    roles?: Partial<Record<RoleTypes, string[]>>;

    host?: {
        mention?: boolean;
        id: string;
    };
    options?: Pick<
        MessageCreateOptions,
        "content" | "embeds" | "components" | "files"
    >;
    button?: {
        /** Use the unicode or custom Discord EMOJI ID */
        emoji?: string;
        style?: ButtonStyles | ButtonStyle;
    };
    entries?: Entries[];
}

export type AddGiveawayWithTemplate = Omit<AddGiveaway, "prize"> & {
    template: string;
    prize?: string;
};
