import { status } from "@elara-services/utils";
import type { User } from "discord.js";
import type {
    CachedOptions,
    CanvasResponse,
    MemberPresenceStatus,
    Users,
} from "../../interfaces";
import { colors, getData, getUserAvatar } from "../../utils";

export async function canvacord(
    user: User,
    db: CachedOptions<Users>,
    rank: number,
    memberStatus?: MemberPresenceStatus,
): CanvasResponse {
    if (memberStatus === "offline") {
        memberStatus = "invisible";
    }
    const canvas = await import("canvacord").catch(() => null);
    if (!canvas) {
        return status.error(
            `Unable to find 'canvacord', make sure you have it installed!`,
        );
    }
    canvas.Font.loadDefault();
    const { level, xp } = getData(db);

    const ca = new canvas.RankCardBuilder()
        .setAvatar(getUserAvatar(user))
        .setUsername(user.displayName)
        .setLevel(level)
        .setCurrentXP(xp.current)
        .setRank(rank)
        .setRequiredXP(xp.required);
    if (memberStatus) {
        ca.setStatus(memberStatus);
    } else {
        ca.configureRenderer({ status: false });
    }
    ca.options.set("tw", {
        ...ca.options.get("tw"),
        username: `text-[${colors.hex.white}]`,
        displayName: `text-[${colors.get(db, "canvacord.username", true)}]`,
        percentage: `text-[${colors.hex.white}]`,
        progress: {
            thumb: `bg-[${colors.get(db, "canvacord.progress.thumb", true)}]`,
            track: "",
        },
    });
    if (db.background) {
        ca.setBackground(db.background);
    }
    if (user.discriminator !== "0") {
        ca.setDiscriminator(user.discriminator);
    }
    return {
        status: true,
        image: (await ca.build({ format: "png" })) as Buffer,
    };
}
