import type { User } from "discord.js";

export type Invite = {
    code: string;
    inviter: {
        username: string;
        id: string;
        bot: boolean;
        discriminator: string;
        avatar: string | null;
    } | null;
    uses: number | "♾️";
    channel: { name: string | null; id: string } | null;
    temporary: boolean;
};

export type FetchOnJoinResult = {
    code: string;
    inviter?: User | null;
    uses: number | string;
} | null;

export interface FetchedMemberInvitesResponse {
    guild_id: string;
    members: {
        member: {
            avatar: string | null;
            communication_disabled_until: string | null;
            unusual_dm_activity_until: string | null;
            flags: number;
            joined_at: string | null;
            nick: string | null;
            pending: boolean;
            premium_since: string | null;
            roles: string[];
            user: {
                id: string;
                username: string;
                avatar: string | null;
                discriminator: string | "0000" | "0";
                public_flags: number;
                premium_type?: number;
                flags: number;
                banner: string | null;
                accent_color: string | null;
                global_name: string | null;
                avatar_decoration_data: object | null;
                banner_color: string | null;
            };
            mute: boolean;
            deaf: boolean;
        };
        source_invite_code: string | null;
        notFound: boolean;
        join_source_type: number;
        uses: number;
        inviter_id: string | null;
        joinType?:
            | "bot"
            | "server_discovery"
            | "normal"
            | "vanity"
            | "integration"
            | "unknown";
        inviter?: User | null;
    }[];
    page_result_count: number;
    total_result_count: number;
}

export type AndQuery<T = string> = {
    or_query: T[];
};

export interface Query {
    limit?: number;
    after?: {
        guild_joined_at: number;
        user_id: string;
    };
    and_query: {
        source_invite_code?: AndQuery<string>;
        join_source_type?: AndQuery<number>;
        usernames?: AndQuery<string>;
        user_id?: AndQuery<string>;
        // inviter_id?: AndQuery<string>; // Pending Discord adding support for it. I doubt they ever will tbh
    };
}

export type MakeRequestData =
    | { status: true; data: FetchedMemberInvitesResponse }
    | { status: false; message: string };
