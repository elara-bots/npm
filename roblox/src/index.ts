import { debug as DEBUG, is } from "@elara-services/basic-utils";
import { name, version } from "../package.json";
import { RobloxAPI } from "./api";
import { RobloxHelpers } from "./helpers";
import { RobloxServiceData, RobloxServicesOptions, StrNum } from "./interfaces";
import { RobloxServices } from "./services";
import { bug, isNumberOnly } from "./utils";

export * from "./api";
export * from "./helpers";
export * from "./interfaces";
export * from "./lib";
export * from "./services";
export * from "./utils";

export class Roblox {
    public services = new RobloxServices();
    public api = new RobloxAPI();
    public helpers = new RobloxHelpers();
    public constructor(
        services?: RobloxServiceData[],
        debug?: boolean,
    ) {
        if (is.boolean(debug)) {
            DEBUG.set({ enabled: debug, name, version });
        }
        if (is.array(services)) {
            this.services.bulk.add(services, true);
            bug(`Adding (${services.map((c) => c.name).join(", ")}) custom services`);
        }
    }

    public setCookie(cookie: string) {
        this.api.setCookie(cookie);
        return this;
    }

    public setDebug(enabled: boolean) {
        if (!DEBUG.has(name)) {
            DEBUG.set({ enabled, name, version });
        } else {
            DEBUG.toggle(name, enabled);
        }
        return this;
    }

    public async isVerified(user: string, options: RobloxServicesOptions = {}) {
        const r = await this.services.getRobloxId(user, options);
        return r.status ? true : false;
    };

    public async get(
        user: StrNum, 
        options: Partial<RobloxServicesOptions & { basic: boolean }> = {},
    ) {
        const basic = is.boolean(options.basic) ? options.basic : false;
        if (is.string(user)) {
            if (user.match(/<@!?/gi) || (user.match(/^(?<id>\d{17,20})$/gi) && isNumberOnly(user))) {
                const r = await this.services.getRobloxId(user.replace(/<@!?|>/gi, ""), { 
                    guildId: options.guildId, 
                    service: options.service,
                });
                if (!r.status) {
                    return r;
                }
                return basic ? this.api.basic(r.robloxId, r.service) : this.api.fetch(r.robloxId, r.service, options.groups ?? true);
            }
        }
        if (!isNumberOnly(user) && !is.number(user, false)) {
            const c = await this.api.search(`${user}`, basic, options.groups ?? true);
            if (!c.status) {
                return c;
            }
            if (c.basic) {
                return c;
            }
            return c;
        }
        return await this.api.fetch(user, `RobloxIDSearch`, options.groups ?? true);
    }


    /** --- Deprecated Functions */

    /**
     * @deprecated Use '<Roblox>.helpers.discord.message' instead
     */
    public get showDiscordMessageData() {
        return this.helpers.discord.message;
    }
}