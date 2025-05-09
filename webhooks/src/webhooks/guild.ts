import type { Guild } from "discord.js";
import { Webhook } from "./token";

/**
 * @description A Manager for webhooks through the discord.js Guild
 */
export class GuildWebhook extends Webhook {
    public constructor(public guild: Guild) {
        super(guild.client.token);
    }
}