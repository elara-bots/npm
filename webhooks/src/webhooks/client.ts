import type { Client } from "discord.js";
import { Webhook } from "./token";

/**
 * @description A Manager for webhooks through the discord.js Client
 */
export class ClientWebhook extends Webhook {
    public constructor(public client: Client<true>) {
        super(client.token);
    }
}