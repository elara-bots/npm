import { status } from "@elara-services/utils";
import type { User } from "discord.js";
import type {
    ArcaneUser,
    CachedOptions,
    CanvasResponse,
    Users,
} from "../../interfaces";
import { colors, getData } from "../../utils";
const defs = {
    progress: {
        first: "#008cff",
        second: "#ffffff",
    },
    username: "#008cff",
    background: {
        first: "#36393f",
        second: "#008cff",
    },
};
export async function arcane(
    user: User,
    db: CachedOptions<Users>,
    rank: number
): CanvasResponse {
    const { xp, level } = getData(db);
    return createArcaneRankProfile({
        username: user.username,
        level,
        rank,
        xp: {
            current: xp.current,
            max: xp.required,
        },
        avatar: user.displayAvatarURL({ forceStatic: true, extension: "png" }),
        background: db.background,
        colors: {
            progress: {
                first: colors.get(db, "arcane.progress.first", true),
                second: colors.get(db, "arcane.progress.second"),
            },
            background: {
                first: colors.get(db, "arcane.background.first"),
                second: colors.get(db, "arcane.background.second", true),
            },
            username: colors.get(db, "arcane.username", true),
        },
    });
}

async function createArcaneRankProfile(user: ArcaneUser): CanvasResponse {
    // @ts-ignore
    const Canvas = await import("skia-canvas").catch(() => null);
    if (!Canvas) {
        return status.error(`Unable to find 'skia-canvas'`);
    }

    if (!Canvas.FontLibrary.has("Raleway")) {
        Canvas.FontLibrary.use(`Raleway`, `./src/fonts/Raleway.ttf`);
    }

    const canvas = new Canvas.Canvas(800, 200);
    const ctx = canvas.getContext("2d");
    if (user.background) {
        await rectangle(
            ctx,
            0,
            0,
            canvas.width,
            canvas.height,
            10,
            user.background
        );
    } else {
        // Draw the background.
        ctx.fillStyle = user.colors?.background?.first || defs.background.first;
        await rectangle(ctx, 0, 0, canvas.width, canvas.height, 10, true);

        ctx.fillStyle =
            user.colors?.background?.second || defs.background.second;
        await rectangle(ctx, 700, 0, 100, canvas.height, 10, true);
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(530, 0);
        ctx.lineTo(canvas.width - 50, 0);
        ctx.lineTo(canvas.width - 50, canvas.height);
        ctx.lineTo(680, canvas.height);
        ctx.lineTo(530, 0);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    // Draw progress bar.
    ctx.fillStyle = user.colors?.progress?.second || defs.progress.second;
    await rectangle(ctx, 20, 150, 600, 30, 5, true);
    ctx.fillStyle = user.colors?.progress?.first || defs.progress.first;
    await rectangle(
        ctx,
        20,
        150,
        (user.xp.current * 600) / user.xp.max,
        30,
        5,
        true
    );

    // Draw user info.
    await rectangle(
        ctx,
        20,
        20,
        120,
        120,
        70,
        user.avatar ||
            "https://cdn.discordapp.com/emojis/1081469562106691655.png"
    );
    ctx.lineWidth = 7;
    ctx.strokeStyle = "#36393f";
    ctx.font = "40px Raleway";

    // Draw spacer.
    ctx.fillStyle = user.colors?.username || defs.username;
    await rectangle(ctx, 150, 80, width(user.username), 2, 1, true);

    // Write user stats.
    ctx.fillStyle = "#fefefe";
    ctx.strokeText(user.username, 150, 76);
    ctx.fillText(user.username, 150, 76);

    ctx.font = "20px Raleway";
    ctx.globalAlpha = 0.4;
    if (user.background) {
        ctx.fillStyle = "#000000";
    } else {
        ctx.fillStyle = "#ffffff";
    }
    await rectangle(
        ctx,
        150,
        100,
        width(`Level ${user.level}`, 10),
        25,
        5,
        true
    );
    await rectangle(
        ctx,
        width(`Level ${user.level}`, 155, 15),
        100,
        width(`Rank ${user.rank}`, 10),
        25,
        5,
        true
    );
    await rectangle(
        ctx,
        width(`Level ${user.level}`, `Rank ${user.rank}`, 155, 35),
        100,
        width(`${user.xp.current} / ${user.xp.max} XP`, 10),
        25,
        5,
        true
    );

    ctx.globalAlpha = 1;
    ctx.fillStyle = "#fefefe";
    ctx.fillText(`Level ${user.level}`, 155, 120);
    ctx.fillText(
        `Rank ${user.rank}`,
        width(`Level ${user.level}`, 155, 20),
        120
    );
    ctx.fillText(
        `${user.xp.current} / ${user.xp.max} XP`,
        width(`Level ${user.level}`, `Rank ${user.rank}`, 155, 40),
        120
    );

    function width(...params: any[]) {
        let width = 0;
        for (const param of params) {
            width +=
                typeof param === "string"
                    ? ctx.measureText(param).width
                    : param;
        }
        return width;
    }
    return {
        status: true,
        image: await canvas.toBuffer("png"),
    };
}

function rectangle(
    ctx: any,
    x: number,
    y: number,
    width: number,
    height: number,
    radius:
        | number
        | boolean
        | {
              tl: number;
              tr: number;
              br: number;
              bl: number;
          },
    background?: string | boolean,
    stroke?: boolean
) {
    return new Promise(async (resolve) => {
        // @ts-ignore
        const canvas = await import("skia-canvas").catch(() => null);
        if (!canvas) {
            return resolve(void 0);
        }
        const img = typeof background === "string";

        if (typeof stroke === "undefined") {
            stroke = false;
        }
        if (typeof radius === "undefined") {
            radius = 5;
        }
        radius =
            typeof radius === "number"
                ? { tl: radius, tr: radius, br: radius, bl: radius }
                : { tl: 0, tr: 0, br: 0, bl: 0 };

        if (img) {
            ctx.save();
        }
        ctx.beginPath();
        ctx.moveTo(x + radius.tl, y);
        ctx.lineTo(x + width - radius.tr, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius.tr);
        ctx.lineTo(x + width, y + height - radius.br);
        ctx.quadraticCurveTo(
            x + width,
            y + height,
            x + width - radius.br,
            y + height
        );
        ctx.lineTo(x + radius.bl, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius.bl);
        ctx.lineTo(x, y + radius.tl);
        ctx.quadraticCurveTo(x, y, x + radius.tl, y);
        ctx.closePath();

        if (img) {
            ctx.clip();
            const image = await canvas.loadImage(background).catch(() => null);
            if (image) {
                ctx.drawImage(image, x, y, width, height);
            }
            ctx.restore();
        } else if (!img && background) {
            ctx.fill();
        }
        if (stroke) {
            ctx.stroke();
        }
        resolve(void 0);
    });
}
