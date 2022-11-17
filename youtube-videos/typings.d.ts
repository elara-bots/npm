declare module "@elara-services/youtube-videos" {
    import { EventEmitter } from "events";
    export type ResponseType = Promise<object|string|Error>


    export class YouTubeVideos {
        public constructor(); 
        private emitter: EventEmitter;
        public data: Set<string>;
        private interval: number;
        private announced: Set<string>;
        public setSearch(minutes: number): this;
        public listen(event: 'video', listener: (channelId: string, videos: Feed['videos']) => void): YouTubeVideos;
        public listen(event: 'searching', listener: (channels: string[]) => void): YouTubeVideos;
        public creators: {
            add(channelId: string): YouTubeVideos;
            remove(channelId: string): YouTubeVideos;
            list(): string[];
            bulk(channels: string[]): YouTubeVideos;
        };

        public run(): Promise<void>;
    }

    export interface Feed {
        channel: {
            name: string;
            url: string;
        };
        videos: {
            id: string;
            url: string;
            title: string;
            uploadDate: string;
            uploadDateFormat: string;
            uploadDateMinutes: number;
        }[]
    }

    export interface Thumbnail {
        width: number;
        height: number;
        url: string;
    }

    export interface Video {
        kind: string;
        etag: string;
        id: string;
        snippet: {
            publishedAt: string;
            channelId: string;
            title: string;
            description: string;
            thumbnails: {
                default: Thumbnail;
                medium: Thumbnail;
                high: Thumbnail;
                standard: Thumbnail;
                maxres: Thumbnail;
            };
            channelTitle: string;
            tags: string[];
            categoryId: string;
            liveBroadcastContent: string;
            localized: {
                title: string;
                description: string;
            };
            defaultAudioLanguage: string;
        };
        status: {
            uploadStatus: string;
            privacyStatus: string;
            license: string;
            embeddable: boolean;
            publicStatsViewable: boolean;
            madeForKids: boolean;
        };
        statistics: {
            viewCount: string;
            likeCount: string;
            favoriteCount: string;
            commentCount: string;
        };
        contentDetails: {
            duration: string;
            dimension: string;
            definition: string;
            caption: 'true' | 'false';
            licensedContent: boolean;
            regionRestriction?: {
                allowed?: string[];
                blocked?: string[];
            };
            contentRating?: object;
            projection: '360' | 'rectangular';
            hasCustomThumbnail: boolean;
        }
    }

    export class util extends null {
        static fetchFeed(id: string): Promise<Feed|null>;
        static fetchVideos(ids: string[], key: string): Promise<Video[]|null>;
        static findVideo(data: Video[], id: string): Video | null;
        static isNew(video: Feed, minutes: number): boolean;
        static time(date: string | Date, format?: 'm' | string, parse?: boolean): number | string;
    }
}