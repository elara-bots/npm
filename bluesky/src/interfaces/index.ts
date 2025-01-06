import type { PostView } from "@atproto/api/dist/client/types/app/bsky/feed/defs";
export * from "./api";
export * from "./stream";

export interface APIKey {
    service?: "https://bsky.social" | string;
    username: string;
    appKey: string;
}

export interface Common {
    keys: APIKey | APIKey[];
    debug?: boolean;
}

export type PostViewed = PostView & {
    record: {
        createdAt: string;
        text: string;
        $type: string;
        embed: {
            $type: string;
            external?: {
                uri: string;
                thumb: {
                    $type: string;
                    ref: {
                        $link: string;
                    };
                    mimeType: string;
                    size: number;
                };
                title: string;
                description: string;
            };
        };
        langs: string[];
        facets: {
            index: {
                byteStart: number;
                byteEnd: number;
            };
            features: {
                $type: string;
                uri: string;
            }[];
        }[];
    };
};
