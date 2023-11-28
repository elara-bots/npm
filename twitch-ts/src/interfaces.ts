import type { Response } from "@elara-services/fetch";

export interface User {
    broadcaster_type: "partner" | "affiliate" | string;
    description: string;
    display_name: string;
    id: string;
    live: boolean;
    login: string;
    offline_image_url: string;
    profile_image_url: string;
    type: "staff" | "admin" | "global_mod" | string;
    view_count: number;
    created_at: string;
}

export type Bearer = {
    token: string | null;
    expire: number;
};

export interface Success {
    status: true;
}
export interface GetURL extends Success {
    url: string;
}
export type Data = string | string[];
export type GetUrlResults = GetURL | MessageStatus;
export interface SuccessData<D> extends Success {
    status: true;
    data: D;
}
export interface FetchBearer {
    access_token: string;
    expires_in: number;
}
export type Results<D> = Promise<SuccessData<D> | MessageStatus>;
export type StreamResults = FetchResults<Stream[]>;
export interface FetchAllResults extends Success {
    users: User[];
    streams: Stream[];
}
export type FetchAllResult = Promise<FetchAllResults | MessageStatus>;
export type FetchResults<D> = Promise<
    SuccessData<D> | (MessageStatus & { code?: 500 })
>;
export type FetchResponse =
    | Response
    | {
          statusCode: number;
          json: () => null;
          headers: Record<string, string | number>;
      };
export interface VodQuery {
    users?: string[];
    games?: string[];
    vodIds?: string[];
    type?: "all" | "upload" | "highlight" | "archive";
    sort?: "time" | "trending" | "views";
    language?: string;
    period?: "all" | "day" | "week" | "month";
}

export interface AnnounceData {
    webhooks: string[];
}
export interface AnnounceCache {
    url: string;
    messageId: string;
}

export interface Vod {
    id: string;
    stream_id: string;
    user_id: string;
    user_name: string;
    title: string;
    descrption: string;
    thumbnail_url: string;
    created_at: string;
    published_at: string;
    url: string;
    viewable: "public" | string;
    view_count: number;
    language: string;
    type: "archive" | "highlight" | "upload";
    duration: string;
    muted_segments:
        | {
              duration: number;
              offset: number;
          }[]
        | null;
}
export type MessageStatus = {
    status: false;
    message: string;
};

export interface Stream {
    id: string;
    user_id: string;
    user_login: string;
    user_name: string;
    game_id: string;
    game_name: string;
    type: "live" | string;
    title: string;
    viewer_count: number;
    started_at: string;
    language: string;
    thumbnail_url: string;
    tag_ids: string;
    is_mature: boolean;
}

export interface LiveStream extends Stream {
    duration: string;
    tags: string[];
}
