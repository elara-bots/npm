import { is, noop, status, XOR } from "@elara-services/utils";
import type {
    AddGiveaway,
    AddGiveawayWithTemplate,
    AddTemplate,
    GiveawayTemplate,
    UpdateTemplateOptions,
} from "../interfaces";
import { GiveawayBuilder } from "./builder";
import { GiveawayClient } from "./client";

export class GiveawayTemplates {
    public constructor(private api: GiveawayClient) {}

    async #get(name: string, guildId: string) {
        return (await this.api.dbs.templates
            .findOne({ name, guildId })
            .catch(noop)) as GiveawayTemplate | null;
    }
    async #update(
        name: string,
        guildId: string,
        options: UpdateTemplateOptions
    ) {
        return await this.api.dbs.templates
            .updateOne(
                {
                    name,
                    guildId,
                },
                {
                    $set: options,
                }
            )
            .catch(noop);
    }

    public async get(name: string, guildId: string) {
        return await this.#get(name, guildId);
    }

    public async create(options: AddTemplate) {
        if (!is.string(options.name) || !is.string(options.guildId)) {
            return status.error(
                `You failed to provide (options.name) or (options.guildId)`
            );
        }
        if (!is.object(options.data)) {
            return status.error(`You failed to provide (options.data)`);
        }
        const { name, guildId, data } = options;
        const f = await this.#get(name, guildId);
        if (f) {
            return status.error(`Template (${name}) already exists!`);
        }
        const r = await this.api.dbs.templates
            .insertOne({
                name,
                guildId,
                data: {
                    button: data.button,
                    entries: is.array(data.entries) ? data.entries : [],
                    guildId,
                    host: data.host,
                    message: data.message,
                    prize: data.prize,
                    roles: data.roles,
                    winners: data.winners || 1,
                    endTimer: is.number(data.endTimer)
                        ? data.endTimer
                        : undefined,
                    embed: data.embed,
                },
            } as Omit<GiveawayTemplate, "_id">)
            .catch((e) => new Error(e));
        if (r instanceof Error) {
            return status.error(
                `Unable to create the template, error: ${r.message}`
            );
        }
        return status.success(
            `Created template (${name}) for (${guildId}) server. (ID: ${r.insertedId.toString()})`
        );
    }

    public async edit(
        name: string,
        guildId: string,
        options: UpdateTemplateOptions
    ) {
        const f = await this.#get(name, guildId);
        if (!f) {
            return status.error(
                `Template (${name}) doesn't exist in (${guildId}) server.`
            );
        }
        const r = await this.#update(name, guildId, options);
        if (!r) {
            return status.error(`Unable to update (${name}) template`);
        }
        return status.data(r);
    }

    public async del(name: string, guildId: string) {
        return await this.api.dbs.templates
            .deleteOne({ name, guildId })
            .catch(noop);
    }

    public async list(guildId?: string) {
        return (await this.api.dbs.templates
            .find(guildId ? { guildId } : {})
            .toArray()
            .catch(() => [])) as GiveawayTemplate[];
    }

    public async toGiveaway<
        D extends XOR<AddGiveaway, AddGiveawayWithTemplate>
    >(name: string, guildId: string, data: D) {
        if (!is.string(data.guildId)) {
            data.guildId = guildId;
        }
        const f = await this.get(name, guildId);
        const g = new GiveawayBuilder(data);
        if (!f) {
            return g.toJSON();
        }
        const { data: c } = f;
        if (is.number(c.endTimer)) {
            g.setEndTimer(c.endTimer);
        }
        if (
            is.object(c.button) &&
            (is.string(c.button.emoji) ||
                is.number(c.button.style) ||
                is.string(c.button.style))
        ) {
            g.setButton(c.button);
        }
        if (is.string(c.prize) && !is.string(data.prize)) {
            g.setPrize(c.prize);
        }
        if (is.array(c.entries)) {
            g.setEntries(c.entries);
        }
        if (is.object(c.embed)) {
            if (is.string(c.embed.image)) {
                g.setImage(c.embed.image);
            }
            if (is.string(c.embed.thumbnail)) {
                g.setThumbnail(c.embed.thumbnail);
            }
            if (is.number(c.embed.color)) {
                g.setColor(c.embed.color);
            }
        }
        if (is.object(c.roles)) {
            if (is.array(c.roles.add)) {
                g.setAddRoles(c.roles.add);
            }
            if (is.array(c.roles.remove)) {
                g.setRemoveRoles(c.roles.remove);
            }
            if (is.array(c.roles.required)) {
                g.setRequiredRoles(c.roles.required);
            }
        }
        if (is.object(c.host)) {
            g.setHost(c.host.id, c.host.mention);
        }
        if (is.number(c.winners)) {
            g.setWinners(c.winners);
        }
        if (is.object(c.message)) {
            g.setMessage(c.message);
        }
        return g.toJSON();
    }
}
