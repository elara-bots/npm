import { status } from "@elara-services/utils";
import { User } from "discord.js";
import { CachedOptions, CanvasResponse, Users } from "../src/interfaces";

export async function canvasRankProfileName(user: User, db: CachedOptions<Users>, position: number): CanvasResponse {
    // IF you need to fail the function at all use: 
    if (!user) { // Example
        return status.error(`Message here`);
    }
    console.log(user, db, position);
    return {
        status: true,
        image: Buffer.from("xxx"), // Return an image buffer 
    };
}