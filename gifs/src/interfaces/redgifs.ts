export interface RedGifsUserPost {
    avgColor: string;
    createDate: number;
    created: string;
    description: string;
    duration: number;
    gallery: string | null;
    hasAudio: boolean;
    height: number;
    hideHome: boolean;
    hideTrending: boolean;
    hls: boolean;
    id: string;
    likes: number;
    niches: string[];
    published: boolean;
    tags: string[];
    type: number;
    userName: string;
    verified: boolean;
    views: number;
    width: number;
    sexuality: string[];
    url: string;
    urls: {
        sd: string;
        hd: string;
        poster: string;
        thumbnail: string;
        vthumbnail: string;
    };
}

export interface RedGifsUser {
    creationtime: number;
    created: string;
    description: string;
    followers: number;
    following: number;
    gifs: number;
    name: string;
    profileImageUrl: string;
    profileUrl: string;
    publishedCollections: number;
    publishedGifs: number;
    status: string;
    subscription: number;
    url: string;
    username: string;
    verified: boolean;
    views: number;
    poster: string;
    preview: string;
    thumbnail: string;
    likes: number;
    links?: unknown[];
}

export interface RedGifsSearchResult {
    page: number;
    pages: number;
    total: number;
    gifs: RedGifsUserPost[];
    users: RedGifsUser[];
    niches: RedGifsNiche[];
    tags: string[];
}
export interface RedGifsNiche {
    cover: string;
    description: string;
    gifs: number;
    id: string;
    name: string;
    owner: string;
    subscribers: number;
    thumbnail: string;
}

export type RedGifSearchOrder = "new" | "trending" | "best" | "old" | string;

export type RedGifsGetResults<D extends object> =
    | {
          status: true;
          data: D;
      }
    | {
          status: false;
          message: string;
      };

export interface RedGifsGetOptions {
    endpoint: string | undefined;
    auth?: boolean;
    body?: Record<string, unknown> | null;
    query?: Record<string, string | number> | null;
    headers?: Record<string, string | number> | null;
    retry?: boolean;
}

export interface RedGifsFetchPost {
    gif: {
        id: string;
        createDate: number;
        hasAudio: boolean;
        width: number;
        height: number;
        hls: boolean;
        likes: number;
        niches: string[];
        tags: string[];
        verified: boolean;
        views: number;
        description: string;
        duration: number;
        published: boolean;
        type: number;
        urls: {
            sd: string;
            hd: string;
            gif?: string;
            poster: string;
            thumbnail: string;
            vthumbnail: string;
        };
        userName: string;
        avgColor: string;
        gallery: object | null;
        hideHome: boolean;
        hideTrending: boolean;
        sexuality: string[];
    };
    user: {
        creationtime: number;
        description: string;
        followers: number;
        following: number;
        gifs: number;
        name: string;
        profileImageUrl: string;
        profileUrl: string;
        publishedGifs: number;
        publishedCollections: number;
        subscription: number;
        status: string;
        url: string;
        username: string;
        verified: boolean;
        views: number;
        poster: string;
        preview: string;
        thumbnail: string;
    };
    niches: string[];
}
