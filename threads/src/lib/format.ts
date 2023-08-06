import { is } from "@elara-services/utils";
import type { ThreadItem, ThreadsUser } from "threads-api";
import { getContent, getImages, getVideos } from "./utils";

export const format = {
    user: (user: ThreadsUser) => {
        return {
            username: user.username,
            id: user.pk || user.id,
            avatar: user.profile_pic_url || "",
            verified: user.is_verified || false,
            following: user.follower_count || 0,
            followers: user.following_count || 0,
        };
    },

    post: ({
        post,
        view_replies_cta_string,
    }: ThreadItem): FormatPost | null => {
        if (!post) {
            return null;
        }
        const { share_info } = post.text_post_app_info || {
            share_info: { quoted_post: null, reposted_post: null },
        };
        return {
            replies: parseInt(view_replies_cta_string?.split(" ")?.[0] || "0"),
            likes: post.like_count || 0,
            created: {
                iso: new Date(post.taken_at * 1000).toISOString(),
                unix: post.taken_at,
            },
            content: getContent(post),
            id: post.pk,
            code: post.code,
            images: getImages(post),
            videos: getVideos(post),
            url: `https://threads.net/@${post.user.username}/post/${post.code}`,
            user: format.user(post.user),
            posts: {
                quoted: is.object(share_info.quoted_post)
                    ? format.post({
                          post: share_info.quoted_post,
                          view_replies_cta_string: "0 replies",
                      } as ThreadItem)
                    : null,
                reposted: is.object(share_info.reposted_post)
                    ? format.post({
                          post: share_info.reposted_post,
                          view_replies_cta_string: "0 replies",
                      } as ThreadItem)
                    : null,
                repliedTo:
                    is.object(post?.text_post_app_info?.reply_to_author) &&
                    is.string(
                        (post?.text_post_app_info?.reply_to_author as any)
                            ?.username
                    )
                        ? ((post.text_post_app_info.reply_to_author as any)
                              .username as string)
                        : null,
            },
        };
    },
};

export interface FormatPost {
    replies: number;
    likes: number;
    created: {
        iso: string;
        unix: number;
    };
    content: string | null;
    id: string;
    code: string;
    images: string[] | null;
    videos: string[] | null;
    url: string;
    user: ReturnType<typeof format.user>;
    posts: {
        quoted: FormatPost | null;
        reposted: FormatPost | null;
        repliedTo: string | null;
    };
}
