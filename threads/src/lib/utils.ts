import { is } from "@elara-services/utils";
import type { Post, ThreadItem } from "threads-api";

export function isNew(post: ThreadItem, timeout: number) {
    if (Date.now() - post.post.taken_at * 1000 <= timeout + 1000) {
        return true;
    }
    return false;
}
function between(x: number, min: number, max: number) {
    return x >= min && x <= max;
}

export function getImages(post: Post) {
    const videos: string[] = is.array(post.carousel_media)
        ? post.carousel_media
              .filter(
                  (c: any) =>
                      is.object(c.image_versions2) &&
                      is.array(c.image_versions2.candidates)
              )
              .map((c: any) => c.image_versions2.candidates?.[0]?.url || "")
              .filter((c) => is.string(c))
        : [];

    if (is.array(videos)) {
        return videos;
    }

    if (is.array(post.image_versions2.candidates)) {
        const list = post.image_versions2.candidates.sort(
            (a, b) => b.height - a.height
        );
        if (!is.array(list)) {
            return null;
        }
        const findBestMatch = list.find(
            (c) => between(c.height, 600, 700) && between(c.width, 1000, 1100)
        );
        return findBestMatch ? [findBestMatch.url] : [list[0].url];
    }

    return null;
}

export interface VideoVersions {
    type: number;
    url: string;
}

export function getVideos(post: Post) {
    const videos: string[] = is.array(post.carousel_media)
        ? post.carousel_media
              .filter((c: any) => is.array(c.video_versions))
              .map((c: any) => c.video_versions?.[0]?.url || "")
              .filter((c) => is.string(c))
        : [];

    if (!is.array(videos)) {
        if (is.array(post.video_versions)) {
            const find = (post.video_versions as VideoVersions[]).sort(
                (a: any, b: any) => b.type - a.type
            );
            if (!is.array(find)) {
                return null;
            }
            return [find[0].url];
        }
        return null;
    }
    return videos;
}

export function getContent(post: Post) {
    if (!is.object(post.caption) || !is.string(post.caption?.text)) {
        return null;
    }
    return post.caption.text;
}
