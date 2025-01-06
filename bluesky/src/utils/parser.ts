import type { FormattedStreamPost } from "../interfaces";
export const p = {
    repost: {
        user: {
            name: "%repost.user.username%",
            handle: "%repost.user.handle%",
            id: "%repost.user.id%",
            avatar: "%repost.user.avatar%",
        },
        createdAt: "%repost.created_at%",
    },
    createdAt: "%created_at%",
    text: "%text%",
    type: "%type%",
    replies: "%replies%",
    likes: "%likes%",
    reposts: "%reposts%",
    user: {
        name: "%user.username%",
        handle: "%user.handle%",
        id: "%user.id%",
        avatar: "%user.avatar%",
    },
    links: {
        url: "%links.url%",
        uri: "%links.uri%",
        cid: "%links.cid%",
    },
    images: (num?: number) => `%images${num ? `.[${num}]` : ""}%`,
} as const;

export function parse<D extends object>(obj: D, info: FormattedStreamPost): D {
    let o = JSON.stringify(obj);
    const r = (name: string, str: any) => {
        o = o.replace(new RegExp(name, "gi"), str);
    };
    r(p.user.handle, info.author.handle);
    r(p.user.id, info.author.id);
    r(p.user.avatar, info.author.avatar || "");
    r(p.user.name, info.author.username);
    r(p.text, info.text || "");
    r(p.createdAt, info.createdAt);
    r(p.type, info.type);
    r(p.likes, info.counts.likes || 0);
    r(p.replies, info.counts.replies || 0);
    r(p.reposts, info.counts.reposts || 0);
    r(p.links.url, info.links.url);
    r(p.links.uri, info.links.uri);
    r(p.links.cid, info.links.cid);
    if (info.type === "repost" && info.reposted) {
        r(p.repost.createdAt, info.reposted.createdAt);
        r(p.repost.user.name, info.reposted.user.username);
        r(p.repost.user.handle, info.reposted.user.handle);
        r(p.repost.user.avatar, info.reposted.user.avatar);
        r(p.repost.user.id, info.reposted.user.id);
    } else {
        r(p.repost.createdAt, "");
        r(p.repost.user.id, "");
        r(p.repost.user.handle, "");
        r(p.repost.user.name, "");
        r(p.repost.user.avatar, "");
    }
    if (info.images.length) {
        r(p.images(), info.images.join(" "));
        for (let i = 0; i < info.images.length; i++) {
            // eslint-disable-next-line no-useless-escape
            r(p.images(i), info.images[i] || "");
        }
    } else {
        r(p.images(), "");
        for (let i = 0; i < 50; i++) {
            // eslint-disable-next-line no-useless-escape
            r(p.images(i), "");
        }
    }
    return JSON.parse(o);
}
