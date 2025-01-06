import { FeedViewPost } from "@atproto/api/dist/client/types/app/bsky/feed/defs";
import { is } from "@elara-services/utils";
import { APIKey, FormattedStreamPost, type PostViewed } from "../interfaces";
import { RichText } from "@atproto/api";
export * from "./parser";

export const baseService = "https://bsky.social";
export const base = "https://bsky.app";

export function transformKeys(keys: APIKey | APIKey[]): APIKey[] {
    if (!is.array(keys)) {
        keys = [keys];
    }
    return keys;
}

export function transformText(post: PostViewed) {
    const t = new RichText({
        text: post.record?.text ?? "",
        facets: post.record.facets || [],
    });
    let text = post.record?.text || "";
    if (is.object(post.record)) {
        if (is.array(post.record.facets)) {
            for (const f of post.record.facets) {
                const str = t.unicodeText.slice(
                    f.index.byteStart,
                    f.index.byteEnd
                );
                const c = f.features.find(
                    (c) => c.$type === "app.bsky.richtext.facet#link"
                );
                if (c) {
                    text = text.replace(
                        new RegExp(str, "i"),
                        `[${str}](${c.uri})`
                    );
                }
            }
        }
    }
    return text;
}

export function getRandomKey(keys: APIKey[] | APIKey) {
    keys = transformKeys(keys);
    return keys[Math.floor(Math.random() * keys.length)] as APIKey;
}

export function checkIfNew(post: PostViewed, seconds: number) {
    if (!post.record?.createdAt || !is.number(seconds)) {
        return false;
    }
    if (
        Date.now() - new Date(post.record.createdAt).getTime() <=
        seconds + 1200
    ) {
        return true;
    }
    return false;
}

export function chunk<T>(arr: T[], size: number): T[][] {
    const array: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
        array.push(arr.slice(i, i + size));
    }
    return array;
}

export function formatPost(data: FeedViewPost): FormattedStreamPost {
    const { post } = data;
    const isRepost = data.reason?.$type === "app.bsky.feed.defs#reasonRepost";
    const reason = data.reason as {
        by: {
            did: string;
            handle: string;
            displayName: string;
            avatar: string;
        };
        indexedAt: string;
    } | null;
    return {
        createdAt: (post.record as { createdAt: string })?.createdAt || "",
        text: (post.record as { text: string })?.text || "",
        type: isRepost ? "repost" : "post",
        images:
            ((post.embed?.images || []) as unknown[]).map(
                (c: any) => c.fullsize
            ) || [],
        media: (post.embed?.media || []) as unknown[],
        author: {
            handle: post.author.handle,
            username: post.author.displayName || post.author.handle,
            id: post.author.did,
            avatar: post.author.avatar || null,
        },
        links: {
            url: `${base}/profile/${post.author.handle}/post/${
                post.uri.split("app.bsky.feed.post/")[1]
            }`,
            uri: post.uri,
            cid: post.cid,
        },
        counts: {
            likes: post.likeCount || 0,
            replies: post.replyCount || 0,
            reposts: post.repostCount || 0,
        },
        reposted:
            isRepost && reason && reason.by
                ? {
                      createdAt: reason.indexedAt,
                      user: {
                          username: reason.by.displayName || "",
                          handle: reason.by.handle || "",
                          avatar: reason.by.avatar || "",
                          id: reason.by.did || "",
                      },
                  }
                : null,
    };
}
