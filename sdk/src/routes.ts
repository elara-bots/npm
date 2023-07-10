export const routes = {
    ping: "/site/ping",
    bin: {
        get: (id: string) => `/bin/api/${id}`,
        post: `/bin/api`,
    },
    dbl: {
        get: (token: string, id: string) =>
            `/api/dbl/stats?id=${id}&token=${token}`,
        post: (token: string, id: string, shards: number, servers: number) =>
            `/api/dbl/post?id=${id}&servers=${servers}&shards=${shards}&token=${token}`,
    },
    api: {
        lyrics: (name: string) => `/api/lyrics?name=${name}`,
        photos: (image: string) => `/api/photos/${image}`,
        special: (image: string) => `/api/special?type=${image}`,
        math: `/api/math`,
        translate: `/api/translate`,
        facts: (type: string) => `/api/facts?type=${type.toLowerCase()}`,
        memes: (clean: boolean) => `/api/photos/memes?clean=${clean}`,
        ball: `/api/8ball`,
        dogbreed: (type: string, breed: string) =>
            `/api/dogbreed?type=${type}&breed=${breed}`,
        npm: (name: string) => `/api/npm?name=${name}`,
        time: {
            place: (name: string) =>
                `/api/time?place=${name.toString().toLowerCase()}`,
            all: `/api/time?all=true`,
        },
        docs: (search: string, project: string, branch: string) =>
            `/api/discord.js-docs?search=${search}&project=${project}&branch=${branch}`,
    },

    automod: {
        images: (token: string, percent: number) =>
            `/api/automod/images?token=${token}&percent=${percent}`,
        words: `/api/automod/words`,
        links: `/api/automod/links`,
    },

    dev: {
        blacklist: {
            servers: {
                toggle: ({
                    id,
                    action,
                    name,
                    reason,
                    mod,
                }: {
                    id: string;
                    action: string;
                    name: string;
                    reason: string;
                    mod: string;
                }) =>
                    `/dev/blacklists/servers?id=${id}&action=${action}&name=${encodeURIComponent(
                        name
                    )}&reason=${encodeURIComponent(
                        reason
                    )}&mod=${encodeURIComponent(mod)}`,
                list: (id: string) => `/dev/blacklists/servers?id=${id}`,
            },
            users: {
                toggle: ({
                    id,
                    action,
                    username,
                    tag,
                    reason,
                    mod,
                }: {
                    id: string;
                    action: string;
                    username: string;
                    tag: string;
                    reason: string;
                    mod: string;
                }) =>
                    `/dev/blacklists/users?id=${id}&action=${action}&username=${encodeURIComponent(
                        username
                    )}&tag=${encodeURIComponent(
                        tag
                    )}&reason=${encodeURIComponent(
                        reason
                    )}&mod=${encodeURIComponent(mod)}`,
                list: (id: string) => `/dev/blacklists/users?id=${id}`,
            },
        },
    },

    platform: {
        ytstats: (user: string, token: string) =>
            `/api/platform/yt-stats?user=${user}&token=${token}`,
        twitch: (token: string, name: string) =>
            `/api/platform/twitch?user=${name}&token=${token}`,
        roblox: (id: string, group: boolean) =>
            `/api/platform/roblox${group ? `-group` : ""}?id=${id}`,
        fortnite: (user: string, token: string, platform: string) =>
            `/api/platform/fortnite?user=${user}&token=${token}&platform=${platform}`,
        paladins: (
            devId: string,
            auth: string,
            platform: string,
            username: string
        ) =>
            `/api/platform/paladins?devID=${devId}&auth=${auth}&platform=${platform}&user=${username}`,
        imdb: (name: string, token: string) =>
            `/api/platform/imdb?token=${token}&show=${name}`,
        ytsearch: (name: string, type: string, token: string) =>
            `/api/platform/yt-search?token=${token}&name=${name}&type=${type}`,
        picarto: (search: string) => `/api/platform/picarto?search=${search}`,
    },
};
