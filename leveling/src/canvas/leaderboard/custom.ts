import { getKeys, is, Nullable } from "@elara-services/utils";
import { Canvas, loadImage, type CanvasRenderingContext2D } from "skia-canvas";

export type LeaderboardCustomUser = {
    name: string;
    avatar: string;
    total?: string | number;
    index?: number;
    color?: Nullable<string>;
    showIndexColor?: boolean;
};

interface DrawOptions {
    data: LeaderboardCustomUser;
    color?: Nullable<string>;
    showIndexColor?: boolean;
    i?: number;
    y: number;
}

const av = (id: string) => `https://japi.rest/discord/v1/user/${id}/avatar`;

export async function customLeaderboard(
    users: LeaderboardCustomUser[],
    options: {
        minify?: boolean;
        current?: LeaderboardCustomUser;
        prefix?: Nullable<string>;
        suffix?: Nullable<string>;
        showIndexColor?: boolean;
    } = {},
) {
    const {
        current: currentUser,
        prefix: prefixed,
        suffix,
        showIndexColor,
        minify = false,
    } = options;
    users = users.slice(0, 10);
    let isPart = false;
    if (currentUser && !users.find((c) => c.name === currentUser.name)) {
        isPart = true;
    }
    const canvas = new Canvas(
        1000,
        isPart ? 1210 : 1090 - (10 - users.length) * 110,
    );
    const ctx = canvas.getContext("2d");
    let totalY = 0;
    // @ts-ignore
    for (let i = 0, y = 0; i < 10; i++) {
        if (!users[i]) {
            continue;
        }
        const r = await draw({
            data: users[i],
            i,
            y,
            color: users[i].color === null ? null : users[i].color || "",
            showIndexColor,
        });
        y = r.y;
        i = r.i;
        totalY = r.y;
    }
    if (isPart && currentUser) {
        await draw({
            data: currentUser,
            y: totalY,
            color:
                currentUser.color === null
                    ? null
                    : currentUser.color || "#ed4245",
            showIndexColor,
        });
    }

    async function draw({
        data,
        i,
        y,
        color = null,
        showIndexColor,
    }: DrawOptions) {
        if (!is.number(i, false)) {
            i = 0;
        }
        if (is.string(data.avatar) && !data.avatar.match(/http(s):\/\//gi)) {
            data.avatar = av(data.avatar);
        }
        // Draw rectangles
        ctx.fillStyle = "#000000";
        curved(
            ctx,
            0,
            y,
            canvas.width,
            100,
            { tl: 50, tr: 10, bl: 50, br: 10 },
            true,
        );
        ctx.fillStyle = "#121212";
        curved(ctx, 0, y, 100, 100, 10, true);

        // Draw user info
        ctx.save();
        ctx.beginPath();
        curved(ctx, 0, y, 100, 100, 10, false, false);
        ctx.closePath();
        ctx.clip();
        let image = Buffer.isBuffer(data.avatar)
            ? data.avatar
            : await loadImage(data.avatar).catch(() => null);
        if (!image) {
            image = await loadImage(
                `https://raw.githubusercontent.com/DevelopmentPerson69420/cdn/main/api/bot/i_n_a.png`,
            ).catch(() => null);
        }
        if (image) {
            // @ts-ignore
            ctx.drawImage(image, 0, y, 100, 100);
        }
        ctx.restore();

        // Draw index
        ctx.font = "bold 40px Raleway";
        if (![showIndexColor, data.showIndexColor].some((c) => c === false)) {
            ctx.fillStyle =
                color || ["#FFD700", "#C0C0C0", "#CD7F32"][i] || "#FFFFFF";
        } else {
            ctx.fillStyle = "#FFFFFF";
        }
        const index = `#${data.index ? data.index : i + 1}`,
            indexWidth = ctx.measureText(index).width;
        ctx.fillText(index, 120, 65 + y);

        // Draw circle
        ctx.beginPath();
        ctx.arc(indexWidth + 135, 53 + y, 5, 0, 2 * Math.PI, false);
        ctx.fillStyle = "#C0C0C0";
        ctx.fill();
        let amount = ``;
        let amountWidth = 0;
        if (data.total) {
            // Draw amount
            ctx.fillStyle = "#FFFFFF";
            ctx.font = "30px Raleway";
            amount = `${prefixed || ""}${
                minify && is.number(data.total)
                    ? Intl.NumberFormat("en", {
                          notation: "compact",
                          compactDisplay: "short",
                      }).format(data.total)
                    : data.total.toLocaleString()
            }${suffix || ""}`;
            amountWidth = ctx.measureText(amount).width;
            ctx.fillStyle = "#121212";
            curved(
                ctx,
                canvas.width - amountWidth - 30,
                20 + y,
                amountWidth + 15,
                55,
                10,
                true,
            );
            ctx.fillStyle = "#FFFFFF";
            ctx.fillText(amount, canvas.width - amountWidth - 22, 60 + y);
        }

        // Draw username
        ctx.fillStyle = color || "#FFFFFF";
        ctx.font = "bold 40px Raleway";
        const name = data.name,
            max = canvas.width - amountWidth - 50 - (indexWidth + 150);
        const list = name.split("");
        let total = "";
        for (let i = 0; i < name.length; i++) {
            total += list[i];
            if (ctx.measureText(total).width > max) {
                break;
            }
        }
        ctx.fillText(
            total.length !== name.length
                ? `${total.slice(0, -2)}...${
                      (name.match(/#\d{4}/g)?.[0] || "") as string
                  }`
                : total,
            indexWidth + 150,
            65 + y,
        );
        return { y: (y += 110), i };
    }
    return canvas.toBuffer("png");
}

type MinifyOptions = {
    base: number;
    decimalSeparator: string;
    lowercase: boolean;
    precision: number;
    space: boolean;
    units: string[];
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function minify(value: number, options?: Partial<MinifyOptions>) {
    const options_1 = {
        base: 1000,
        decimalSeparator: ".",
        lowercase: false,
        precision: 2,
        space: false,
        units: ["", "K", "M", "B", "T", "P", "E"],
    };

    const utils_1 = {
        parseValue: (value: number) => {
            const val = parseFloat(value.toString());
            if (isNaN(val)) {
                return "N/A";
            }
            if (
                val > Number.MAX_SAFE_INTEGER ||
                val < Number.MIN_SAFE_INTEGER
            ) {
                throw new RangeError(
                    "Input value is outside of safe integer range",
                );
            }
            return val;
        },
        roundTo: (value: number, precision: number) => {
            if (!Number.isFinite(value)) {
                return "♾";
            }
            if (Number.isInteger(value)) {
                return value;
            }
            return parseFloat(value.toFixed(precision));
        },
    };

    const opts = options
        ? Object.assign(Object.assign({}, options_1), options)
        : options_1;
    if (is.object(options, true)) {
        if (is.boolean(options.lowercase)) {
            opts.lowercase = options.lowercase;
        }
    }
    if (!is.array(opts.units)) {
        throw new Error("Option 'units' must be a non-empty array");
    }
    let [val, unitIndex, suffix] = [utils_1.parseValue(value), 0, new String()];
    const prefix = parseInt(val as string) < 0 ? "-" : new String();
    val = Math.abs(parseInt(val as string));
    for (const result of divider(val, opts.base)) {
        (val = result), (unitIndex += 1);
    }
    const unitIndexOutOfRange = unitIndex >= opts.units.length;
    if (!unitIndexOutOfRange) {
        const unit = opts.units[unitIndex];
        suffix = opts.lowercase ? unit.toLowerCase() : unit;
    } else {
        console.warn(
            "[millify] 'options.units' array is of insufficient length. Add another unit to silence this warning.",
        );
    }
    const [space, rounded] = [
            opts.space && !unitIndexOutOfRange ? " " : new String(),
            utils_1.roundTo(val, opts.precision),
        ],
        formatted = rounded
            .toString()
            .replace(options_1.decimalSeparator, opts.decimalSeparator);
    return `${prefix}${formatted}${space}${suffix}`;

    function* divider(value: number, base: number) {
        let denominator = base;
        while (true) {
            const result = value / denominator;
            if (result < 1) {
                return;
            }
            yield result;
            denominator *= base;
        }
    }
}

type Radus = {
    tl?: number;
    tr?: number;
    br?: number;
    bl?: number;
};

function curved(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    rad: Radus | number = 0,
    fill: boolean,
    stroke = false,
) {
    const radius = {
        tl: 0,
        tr: 0,
        br: 0,
        bl: 0,
    };
    if (is.number(rad)) {
        for (const key of getKeys(radius)) {
            radius[key] = rad;
        }
    } else if (is.object(rad, true)) {
        for (const key of getKeys(rad)) {
            if (is.number(rad[key])) {
                radius[key] = rad[key] || 0;
            }
        }
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
        y + height,
    );
    ctx.lineTo(x + radius.bl, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius.bl);
    ctx.lineTo(x, y + radius.tl);
    ctx.quadraticCurveTo(x, y, x + radius.tl, y);
    ctx.closePath();
    if (fill) {
        ctx.fill();
    }
    if (stroke) {
        ctx.stroke();
    }
}
