import { get, getKeys, is, log, make, noop, Nullable, sleep, status } from "@elara-services/basic-utils";
import { fetch } from "@elara-services/fetch";
import _ from "lodash";
import type { APIKeys, DefaultRobloxServiceData, DefaultService, RobloxServiceData, RobloxServicesOptions } from "./interfaces";
import * as DefaultServices from "./lib";
import { bug, messages } from "./utils";

export class RobloxServices {
    caches = {
        custom: make.map<string, RobloxServiceData>(),
        default: make.map<DefaultService, DefaultRobloxServiceData>(),
    };
    public constructor(data?: RobloxServiceData[]) {
        if (is.array(data)) {
            this.bulk.add(data, true);
        }
    }

    public get default() {
        return {
            names: () => getKeys(DefaultServices),
            /**
              * Note: The 'rover' service requires their bot and the one you registered the API key with to be in the server!
            */
            add: (name: DefaultService, apiKey?: string, otherKeys?: APIKeys) => {
                if (!this.default.names().includes(name.toLowerCase() as DefaultService)) {
                    return status.error(messages.NOT_FOUND(name));
                }
                const f = DefaultServices[name as keyof typeof DefaultServices];
                if (!f) {
                    return status.error(messages.NOT_FOUND(name));
                }

                const data = f(apiKey);
                if (is.array(data.handler.required)) {
                    for (const n of data.handler.required) {
                        if (n === "api_key" && !is.string(apiKey)) {
                            return status.error(messages.REQUIRED(name, `An API Key`));
                        }
                    }
                }
                if (is.object(otherKeys) && is.object(otherKeys.list)) {
                    data.handler.keys = otherKeys;
                }
                this.caches.default.set(data.name, data);
                return status.success(`Added Default Roblox Service (${name})`);
            },

            remove: (name: DefaultService) => {
                const data = this.caches.default.get(name);
                if (!data) {
                    return status.error(`Default Roblox Service (${name}) isn't added to the list.`);
                }
                this.caches.default.delete(name);
                return status.success(`Successfully removed (${name}) from the Default Roblox Service list.`);
            },

            bulk: {
                /**
                 * Note: The 'rover' service requires their bot and the one you registered the API key with to be in the server!
                 */
                add: (data: { name: DefaultService, apiKey?: string, otherKeys?: APIKeys }[]) => {
                    if (!is.array(data)) {
                        return status.error(`'data' needs to be an array and can't be empty.`);
                    }
                    const results = make.array<{ status: boolean, message: string }>();
                    for (const c of data) {
                        results.push(this.default.add(c.name, c.apiKey, c.otherKeys));
                    }
                    return status.data(results);
                },

                remove: (names: DefaultService[]) => {
                    if (!is.array(names)) {
                        return status.error(`No default names provided.`);
                    }
                    const removed = make.array<DefaultService>();
                    for (const n of names) {
                        if (this.caches.default.has(n)) {
                            removed.push(n);
                        }
                    }
                    if (!is.array(removed)) {
                        return status.error(`None of the names provided needed to be removed`);
                    }
                    return status.success(`Successfully removed Default Roblox Services: ${removed.join(", ")}`);
                },
            },

            list: () => [...this.caches.default.values()].sort((a, b) => a.priority - b.priority),
            addNonAPIKeyRequired: () => {
                const added = make.array<string>();
                for (const c of this.default.names()) {
                    const v = DefaultServices[c];
                    if (!v) {
                        continue;
                    }
                    const f = v();
                    if (f.handler.required?.includes("api_key")) {
                        continue;
                    }
                    added.push(c);
                    this.caches.default.set(f.name, f);
                }
                return added;
            }
        }
    }

    public add(data: RobloxServiceData) {
        const s = this.#validate(data);
        if (!s.status) {
            return s;
        }
        const list = [...this.caches.custom.values()];
        const next = list.map((c) => c.priority).sort((a, b) => b - a)?.[0] || 0;

        if (!is.number(data.priority)) {
            data.priority = Math.floor(next + 1);
        } else {
            if (list.find((c) => c.priority === data.priority)) {
                data.priority = Math.floor(next + 1);
            }
        }

        this.caches.custom.set(data.name, data);
        return status.success(`Added (${data.name}) Roblox service to the list!`);
    }

    public remove(name: string) {
        const res = this.get(name);
        if (!res.status) {
            return res;
        }
        this.caches.custom.delete(name);
        return {
            status: true as const,
            message: `Removed (${name}) Roblox service from the list!`,
            /** The data is in stringified form so the function can be shown  */
            data: {
                name: res.data.name,
                priority: res.data.priority,
                handler: res.data.handler.toString(),
            },
        }
    }

    public get(name: string) {
        const f = this.caches.custom.get(name);
        if (!f) {
            return status.error(`Roblox Service (${name}) not found.`);
        }
        return status.data(f);
    }

    public list() {
        return [...this.caches.custom.values()].sort((a, b) => (a.priority || -1) - (b.priority || -1));
    }

    public get bulk() {
        return {
            add: (data: RobloxServiceData[], shouldConsoleLog = false) => {
                if (!is.array(data)) {
                    if (shouldConsoleLog) {
                        log(`[${this.constructor.name}.bulk.add]: ERROR | The 'data' provided needs to be an array and it can't be empty!`);
                    }
                    return status.error(`The 'data' needs to be an array and it can't be empty.`);
                }
                const results = make.array<{ status: boolean, data: RobloxServiceData, error?: string }>();
                for (const d of data) {
                    const add = this.add(d);
                    if (shouldConsoleLog) {
                        log(`[${this.constructor.name}.bulk.add]: ${add.message}`)
                    }
                    results.push({ status: add.status, data: d, error: add.status ? undefined : add.message })
                }
                return status.data(results);
            }
        }
    }

    /**
    * If there is no custom or default services added then Default services without API key requirements will be automatically added.
    */
    public async getRobloxId(id: string, options: RobloxServicesOptions = {}) {
        if (!this.caches.custom.size && !this.caches.default.size) {
            bug(`Trying to add the non-apiKey Default Roblox Services...`);
            await this.default.addNonAPIKeyRequired();
        }
        if (is.string(options.service)) {
            const f = this.caches.custom.get(options.service) || this.caches.default.get(options.service.toLowerCase() as DefaultService);
            if (f) {
                const r = await this.#fetch(f, id, options.guildId);
                if (r) {
                    return status.json({
                        robloxId: r,
                        service: f.name,
                    });
                }
                return status.error(messages.USER_NOT_VERIFIED(id, options.service));
            }
            return status.error(messages.SERVICE_NOT_FOUND(options.service, this.default.names().includes(options.service.toLowerCase() as any)));
        }
        const custom = this.list();
        if (!is.array(custom) && !this.caches.default.size) {
            return status.error(messages.NO_SERVICES);
        }
        let robloxId: Nullable<string> = null;
        let service = "";
        if (is.array(custom)) {
            for await (const c of custom) {
                const r = await this.#fetch(c, id, options.guildId);
                if (r) {
                    robloxId = r;
                    service = c.name;
                    break;
                }
            }
        }
        if (!robloxId) {
            for await (const c of this.default.list()) {
                const r = await this.#fetch(c, id, options.guildId);
                if (r) {
                    robloxId = r;
                    service = c.name;
                    break;
                }
            }
        }
        if (!robloxId) {
            return status.error(messages.USER_NOT_VERIFIED(id, service));
        }
        return status.json({
            robloxId,
            service,
        });
    }

    async #fetch(
        data: RobloxServiceData | DefaultRobloxServiceData,
        discordId: string,
        guildId?: string,
        retries = 0,
    ): Promise<string | null> {
        if (data.handler.required?.includes("guild_id") && !is.string(guildId)) {
            return null;
        }
        const clone = Object.assign({}, data);
        if (
            is.object(clone.handler.keys, true) &&
            is.object(clone.handler.keys.list, true) &&
            is.object(clone.handler.api, true)
        ) {
            const key = clone.handler.keys.list[guildId as string];
            if (key) {
                const k = clone.handler.keys.prefix ? `${clone.handler.keys.prefix} ${key}` : key;
                if (clone.handler.api.headers) {
                    clone.handler.api.headers['Authorization'] = k;
                } else {
                    clone.handler.api.headers = { "Authorization": k };
                }
            }
        }
        let robloxId: Nullable<string> = null;
        if (is.func(clone.handler.execute)) {
            const r = await clone.handler.execute(discordId, guildId);
            if (r.status) {
                robloxId = r.robloxId.toString();
            }
        } else if (is.object(clone.handler.api, true)) {
            const fe = fetch(
                clone.handler.api.endpoint
                    .replace(/%discord_id%/gi, discordId)
                    .replace(/%guild_id%/gi, guildId || ""),
                clone.handler.api.method || "GET"
            );
            if (is.object(clone.handler.api.headers, true)) {
                fe.header(clone.handler.api.headers);
            }
            if (is.object(clone.handler.api.query, true)) {
                fe.query(clone.handler.api.query);
            }
            const r = await fe.send().catch(noop);
            if (r && r.statusCode === 200) {
                const json = r.json();
                if (json) {
                    const id = _.get(json, clone.handler.api.fieldName) as string | undefined;
                    if (id) {
                        robloxId = id.toString();
                    }
                }
            }
            if (r?.statusCode === 429 && retries <= 5) {
                bug(`While searching (${data.name}) Roblox Service for (${discordId}) ${guildId ? ` in (${guildId}) server` : ""}, ran into a ratelimit. Waiting 5s before trying again`);
                await sleep(get.secs(5));
                return await this.#fetch(data, discordId, guildId, retries + 1);
            }
        }
        return robloxId;
    }

    #validate(data: RobloxServiceData) {
        const errors = make.array<string>();
        const noOrEmpty = (name: string) => errors.push(`No (${name}) or it's empty.`)
        if (!is.string(data.name)) {
            noOrEmpty("name");
        }
        if (this.caches.custom.has(data.name)) {
            return status.error(`Roblox Service (${data.name}) name is already in use.`);
        }

        if (!is.object(data.handler)) {
            errors.push(`No 'handler' provided in the data.`);
        }
        if (data.handler.api && data.handler.execute) {
            errors.push(`Handler can only have .api or .execute, you can't do both!`);
        } else
            if (is.object(data.handler.api)) {
                const { api } = data.handler;
                if ("verifyPage" in api && !is.string(api.verifyPage)) {
                    noOrEmpty("handler.api.verifyPage");
                }
                if (!is.string(api.fieldName)) {
                    noOrEmpty("handler.api.fieldName");
                }
                if (!is.string(api.endpoint)) {
                    noOrEmpty(`handler.api.endpoint`);
                }
            } else if (!is.func(data.handler.execute)) {
                errors.push(`Handler (execute) isn't a function`);
            }

        if (is.array(errors)) {
            return status.error(`There was one or multiple errors while trying to add the data: ${errors.join(" | ")}`);
        }

        return status.success(`Good to go!`);
    }
}