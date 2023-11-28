export const base = `https://api.twitch.tv/helix` as const;

export const streams = `${base}/streams` as const;
export const users = `${base}/users` as const;
export const vods = `${base}/videos` as const;

export function sleep(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
}

export const StreamEvents = {
    LIVE: "live",
    UPDATE: "update",
    ENDED: "end",
};
