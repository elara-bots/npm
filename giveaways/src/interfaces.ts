import { ButtonStyles } from "@elara-services/packages";
import { XOR } from "@elara-services/utils";
import { Guild, GuildMember, MessageCreateOptions, TextBasedChannel, User } from "discord.js";
import { MongoClient, MongoClientOptions } from "mongodb";

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
    user: User,
    member: GuildMember,
    guild: Guild,
    db: GiveawayDatabase,
    channel: TextBasedChannel | null,
}

export type GiveawayFilter = (options: GiveawayFilterOptions) => Promise<Status> | Status;

// export type GiveawayFilter = (
//     i: ButtonInteraction,
//     r: getInteractionResponders
// ) => Promise<Status> | Status;

export interface GiveawayDatabase {
    _id: string;
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
        mention: boolean;
    };
}
export type Giveaway<D = void> = GiveawayDatabase & D;

export type OldGiveaway<D = void> = Giveaway<D> & { deleteAfter: string };

export interface GiveawaySettings {
    _id: string;
    guildId: string;
    messages: {
        winner: string;
    };
    entries: Entries[];
}

export type Entries = {
    amount: number;
    roles: string[];
};

export interface GiveawayUser {
    id: string;
    entries: number;
}

export interface AddGiveaway {
    channelId: string;
    prize: string;
    end: Date | string;
    winners?: number;
    mentions?: {
        id: string;
        type: "role" | "user";
    }[];
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
        style?: ButtonStyles;
    };
}
