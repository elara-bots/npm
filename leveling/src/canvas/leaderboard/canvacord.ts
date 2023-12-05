import { is, status } from "@elara-services/utils";
import type {
    CanvasResponseWithQuery,
    LeaderboardCanvasHeader,
    LeaderboardCanvasOptions,
    LeaderboardCanvasPlayers,
    LeaderboardQuery,
} from "../../interfaces";

export async function canvacord(
    players: LeaderboardCanvasPlayers[],
    query: LeaderboardQuery,
    header?: LeaderboardCanvasHeader,
    options?: LeaderboardCanvasOptions,
): CanvasResponseWithQuery {
    players = players.slice(0, 10);
    const canvas = await import("canvacord").catch(() => null);
    if (!canvas) {
        return status.error(
            `Unable to find the (canvacord) npm package, make sure to install it.`,
        );
    }
    canvas.Font.loadDefault();

    const lb = new canvas.LeaderboardBuilder().setPlayers(players);
    if ([1, 2, 3].includes(players.length)) {
        lb.height = 450;
    } else if ([4].includes(players.length)) {
        lb.height = 550;
    } else if ([5, 6].includes(players.length)) {
        lb.height = 750;
    } else {
        lb.height = 1080;
    }
    lb.width = 800;
    if (options) {
        if (is.string(options.background)) {
            lb.setBackground(options.background);
        }
        if (is.string(options.backgroundColor)) {
            lb.setBackgroundColor(options.backgroundColor);
        }
    }
    if (header) {
        lb.setHeader(header);
    }
    return {
        status: true,
        image: (await lb.build({ format: "png" })) as Buffer,
        query,
    };
}
