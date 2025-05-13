import { is } from "@elara-services/basic-utils";
import { SDK } from "@elara-services/sdk";

export const services = new SDK();

// eslint-disable-next-line prefer-const
export let binDefs = {
    viewer: `https://view.elara.workers.dev`,
};
// eslint-disable-next-line prefer-const
export let bins = {
    mine: "https://h.elara.workers.dev",
    haste: "https://h.s8n.workers.dev", // Default haste server, since hastebin.com requires a bin-key now.
    pizza: "https://haste.unbelievaboat.com",
};

export type Bins = keyof typeof bins;

export async function createBin(title: string, args: string, ext = "js", bin: Bins | "mine-f" | "custom" = "mine-f", priv = false) {
    const fetch = async (args: string, url: string, backup: string) => {
        if (!services) {
            return null;
        }
        let res = await services.haste.post(args, {
            extension: ext ?? "js",
            url,
        });
        if (!res.status) {
            res = await services.haste.post(args, {
                extension: ext ?? "js",
                url: backup,
            });
        }
        return res.status ? res.url : `Unable to create any paste link.`;
    };
    if (bin === "mine-f") {
        const b = await services.paste.post(title, args, priv);
        if (!b.status) {
            return fetch(args, bins.mine, bins.haste);
        }
        if (["messages", "discord"].includes(ext)) {
            return `${binDefs.viewer}/${ext}/${b.id}`;
        }
        return `${binDefs.viewer}/bin/${b.id}`;
    }
    const binUrl = bins[bin as Bins];
    if (is.string(binUrl)) {
        return fetch(args, binUrl, bin === "mine" ? bins.haste : bins.mine);
    }
    return fetch(args, bin.match(/http(s)?:\/\//i) ? bin : bins.mine, bins.mine);
}

export const DefaultColors = {
    DEFAULT: 0x000000,
    WHITE: 0xffffff,
    AQUA: 0x1abc9c,
    GREEN: 0x2ecc71,
    BLUE: 0x3498db,
    YELLOW: 0xffff00,
    PURPLE: 0x9b59b6,
    LUMINOUS_VIVID_PINK: 0xe91e63,
    GOLD: 0xf1c40f,
    ORANGE: 0xe67e22,
    RED: 0xe74c3c,
    GREY: 0x95a5a6,
    NAVY: 0x34495e,
    DARK_AQUA: 0x11806a,
    DARK_GREEN: 0x1f8b4c,
    DARK_BLUE: 0x206694,
    DARK_PURPLE: 0x71368a,
    DARK_VIVID_PINK: 0xad1457,
    DARK_GOLD: 0xc27c0e,
    DARK_ORANGE: 0xa84300,
    DARK_RED: 0x992d22,
    DARK_GREY: 0x979c9f,
    DARKER_GREY: 0x7f8c8d,
    LIGHT_GREY: 0xbcc0c0,
    DARK_NAVY: 0x2c3e50,
    BLURPLE: 0x7289da,
    GREYPLE: 0x99aab5,
    DARK_BUT_NOT_BLACK: 0x2c2f33,
    NOT_QUITE_BLACK: 0x23272a,
};

export function resolveColor(color: string | number | number[] | undefined) {
    if (typeof color === "string") {
        if (color === "RANDOM") {
            return Math.floor(Math.random() * (0xffffff + 1));
        }
        if (color === "DEFAULT") {
            return DefaultColors.DEFAULT;
        }
        color = DefaultColors[color as keyof typeof DefaultColors] || parseInt(color.replace("#", ""), 16);
    } else if (Array.isArray(color)) {
        color = (color[0] << 16) + (color[1] << 8) + color[2];
    }

    if (typeof color === "number") {
        if (color < 0 || color > 0xffffff) {
            color = 0;
        } else if (color && isNaN(color)) {
            color = 0;
        }
    }
    return color;
}
