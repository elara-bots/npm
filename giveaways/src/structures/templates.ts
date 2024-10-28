import { noop, status } from "@elara-services/utils";
import type { AddTemplate, GiveawayTemplate } from "../interfaces";
import { GiveawayClient } from "./client";

export class GiveawayTemplates {
    public constructor(private api: GiveawayClient) {}

    async #get(name: string, guildId: string) {
        return await this.api.dbs.templates.findOne({ name, guildId }).catch(noop) as GiveawayTemplate | null;
    }
    async #update(name: string, guildId: string, options: Partial<AddTemplate['data']>) {
        
    }

    public async add(options: AddTemplate) {
        const f = await this.#get(options.name, options.guildId);
        if (f) {
            return status.error(`Template (${options.name}) already exists!`);
        }

    }

}