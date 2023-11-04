export interface TenorGetOptions {
    endpoint: string | undefined;
    body?: Record<string, unknown> | null;
    query?: Record<string, string | number | undefined> | null;
    headers?: Record<string, string | number | undefined> | null;
}

export interface TenorSearchParams {
    q: string;
    locale?: string;
    contentfilter?: "high" | "medium" | "low" | "off";
    media_filter?: "basic" | "minimal";
    ar_range?: "all" | "wide" | "standard";
    limit?: number;
    pos?: string;
    anon_id?: string;
}

export interface TenorSearchResults {
    next: string;
    results: TenorGif[];
}

export type TenorMediaFormats =
    | "gifpreview"
    | "mp4"
    | "nanomp4"
    | "tinygif"
    | "tinywebm"
    | "nanogifpreview"
    | "gif"
    | "mediumgif"
    | "loopedmp4"
    | "tinygifpreview"
    | "tinymp4"
    | "webm"
    | "nanogif"
    | "nanowebm";

export interface TenorGif {
    created: number;
    hasaudio: number;
    id: string;
    media_formats: Record<TenorMediaFormats, TenorGifMedia>;
    title: string;
    content_description: string;
    itemurl: string;
    hascaption: boolean;
    flags: string;
    bg_color: string;
    url: string;
}

export interface TenorGifMedia {
    url: string;
    dims: number[];
    duration: number;
    preview: string;
    size: number;
}
