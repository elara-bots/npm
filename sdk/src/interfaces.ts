import type { APIEmbed } from "discord-api-types/v10";

export interface HasteOptions {
    url?: string;
    extension?: string;
}

export interface Base {
    status: true;
}

export interface Ping extends Base {
    time: number;
}

export interface HasteGet extends Base {
    id: string;
    content: string;
    key: string;
}

export interface HastePost extends Base {
    id: string;
    url: string;
}

export interface PasteGet extends Base {
    key: string;
    url: string;
    content: string;
    title: string;
    created: string;
    expire: string;
    views: number;
}

export interface PastePost extends Base {
    id: string;
    url: string;
}

export interface User {
    username: string;
    id: string;
    tag: string;
    avatar: string | null;
    discriminator: string | number;
    createdAt: string;
    avatarURL: string;
}

export interface DBLBotGet extends Base {
    user: User;
    invite: string;
    lib: string;
    prefix: string;
    cerified: boolean;
    widget: string;
    social: {
        website: string;
        github: string;
        support: string;
    };
    stats: {
        servers: number;
        shards: number;
        points: {
            monthly: number;
            total: number;
        };
    };
    owners: User[];
    tags: string[];
    info: string;
    description: string;
}

export interface DBLUserGet extends Base {
    user: User;
    cerifiedDev: boolean;
    supporter: boolean;
    color: string;
    mod: boolean;
    webMod: boolean;
    banner: string;
    bio: string;
    admin: boolean;
    social: {
        instagram: string;
        github: string;
        twitter: string;
        youtube: string;
        reddit: string;
    };
    bots: DBLBotGet[];
}

export interface DJSDocs extends Base {
    embed: APIEmbed;
}

export interface NPM extends Base {
    name: string;
    url: string;
    tags: string[];
    description: string;
    latest: string;
    maintainers: string[];
    author: string;
    license: string;
    created: string;
    updated: string;
    pages: {
        bugs: string;
        home: string;
        download: string;
        repository: string;
    };
    readme: string;
    versions: unknown[];
    deprecated: string;
}

export interface EightBall extends Base {
    text: string;
    image: string;
}

export interface Fortune extends Base {
    fortune: string;
}
export interface Fortunes extends Base {
    fortunes: string[];
}

export interface Fact extends Base {
    fact: string;
}
export interface Facts extends Base {
    facts: string[];
}

export interface Translate extends Base {
    message: string;
    text: string;
    extra: {
        from: {
            full: string;
            iso: string;
        };
        to: {
            full: string;
            iso: string;
        };
        raw: object;
    };
}

export interface Time extends Base {
    place: string;
    name: string;
}

export interface AllTime extends Base {
    times: {
        name: string;
        value: string;
    }[];
}

export interface Image extends Base {
    image: string;
}

export interface Math extends Base {
    answer: number | string;
}

export interface Lyrics extends Base {
    author: string;
    title: string;
    url: string;
    thumbnail: string;
    lyrics: string;
    raw: object;
}

export interface YTStats extends Base {
    user: {
        username: string;
        id: string;
        created: string;
        country: string;
        banner: string;
        avatars: {
            small: string;
            medium: string;
            large: string;
        };
        links: {
            normal: string;
            custom: string;
        };
    };
    counts: {
        views: number;
        comments: number;
        subscribers: number;
        videos: number;
    };
}

export interface RobloxUser extends Base {
    user: {
        username: string;
        id: number;
        online: string;
        url: string;
        avatar: string;
        bio: string | null;
        joined: string | null;
        lastnames: string[];
        counts: {
            friends: number;
            followers: number;
            following: number;
        };
    };
    groups: {
        name: string;
        id: number;
        rank: number;
        role: string;
        primary: boolean;
        inclan: boolean;
        url: string;
        emblem: {
            url: string;
            id: number;
        };
    }[];
    activity: {
        userPresenceType: number;
        lastLocation: string;
        placeId: string | null;
        rootPlaceId: string | null;
        gameId: string | null;
        universeId: string | null;
        userId: number;
        lastOnline: string | null;
    } | null;
}

export interface RobloxGroup extends Base {
    id: number;
    name: string;
    description: string;
    members: number;
    shout: {
        description: string;
        created: string;
        updated: string;
        by: {
            id: string;
            username: string;
            buildersclub: string;
        };
    };
    hasclan: boolean;
    buildersclubonly: boolean;
    public: boolean;
    owner: {
        id: number;
        username: string;
        buildersclub: string;
    };
    roles: {
        id: number;
        name: string;
        rank: number;
        memberCount: number;
    }[];
}

export interface IMDB extends Base {
    name: string;
    id: number;
    rated: string;
    plot: string;
    genres: string[];
    director: string;
    actors: string[];
    writer: string[];
    country: string;
    languages: string[];
    awards: string;
    ratings: string[];
    metascore: number;
    rating: number;
    poster: string;
    votes: number;
    type: string;
    url: string;
}

export interface IMDBMovie extends IMDB {
    series: false;
    boxoffice: string;
    production: string;
    website: string;
    dvd: string;
    times: {
        year: number;
        released: string;
        run: string;
    };
}

export interface IMDBShow extends IMDB {
    series: true;
    seasons: number;
    episodes: string[];
    times: {
        start: number;
        released: string;
        date: string;
        run: string;
    };
}

export interface Picarto extends Base {
    user: {
        name: string;
        id: number;
        avatar: string;
        url: string;
        type: string;
        recordings: boolean;
        commissions: boolean;
        description_panels: {
            title: string | null;
            body: string | null;
            image: string | null;
            image_link: string | null;
            button_text: string | null;
            button_link: string | null;
            position: number;
        }[];
        private: {
            enabled: boolean;
            message: string;
        };
        languages: {
            name: string;
            id: number;
        }[];
    };
    counts: {
        followers: number;
        subscribers: number;
        views: {
            current: number;
            total: number;
        };
    };
    stream: {
        live: boolean;
        last: string;
        title: string;
        adult: boolean;
        tags: string[];
        multistream: {
            user_id: number;
            name: string;
            online: boolean;
            adult: boolean;
        }[];
        thumbnails: {
            web: {
                normal: string;
                large: string;
            };
            mobile: string;
            tablet: string;
        };
    };
    misc: {
        stream_settings: {
            guest_chat: boolean;
            links: boolean;
            level: number;
        };
    };
}

export interface AutoModWords extends Base {
    filtered: string[];
}

export interface AutoModLinks extends Base {
    links: boolean | string;
    message: boolean | string;
}

export interface AutoModImageResult {
    url_classified: string;
    error_code: number;
    rating_index: number;
    rating_letter: string;
    rating_label: string;
    predictions: {
        teen: number;
        everyone: number;
        adult: number;
    };
}

export interface AutoModImages extends Base {
    images: string[];
    full: {
        percent: number;
        url: string;
        raw: AutoModImageResult;
    }[];
    processed: AutoModImageResult[];
}

export interface BlacklistedServer {
    name: string;
    id: string;
    reason: string;
    moderator: string;
}

export interface BlacklistListAll extends Base {
    ids: string[];
    all: BlacklistedServer[];
}

export interface BlacklistToggle extends Base {
    server: BlacklistedServer;
}

export interface BlacklistedUser {
    username: string;
    id: string;
    moderator: string;
    reason: string;
    tag: string;
}

export interface BlacklistUser extends Base {
    user: BlacklistedUser;
}

export interface BlacklistUserAll extends Base {
    ids: string[];
    all: BlacklistedUser[];
}

export interface Status {
    status: false;
    message: string;
}

export type Response<T> = Promise<T | Status>;
