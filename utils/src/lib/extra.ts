import { Channel, Client, Guild, GuildMember, PermissionResolvable, Role, TimestampStylesString, User, time } from "discord.js";
import Services from "elara-services";
import moment from "moment";
import MS from "ms";
require("moment-duration-format")(moment);

export let times = {
    timeZone: "",
    short: ""
}

export let services = new Services("[KEY_NOT_SET]");

export function sleep(timeout?: number) {
    return new Promise(r => setTimeout(r, timeout));
};

export function chunk<T extends unknown>(arr: T[], size: number): T[][] {
    let array: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
        array.push(arr.slice(i, i + size));
    }
    return array;
}

export function commands(content: string, prefix: string) {
    const str = content.split(/ +/g);
    const name = str[0].slice(prefix.length).toLowerCase();
    return {
        name, args: str.slice(1),
        hasPrefix() {
            if (content.toLowerCase().startsWith(prefix)) {
                return true;
            }
            return false;
        },
        isCommand(commandName: string) {
            if (commandName === name) {
                return true;
            }
            return false;
        }
    }
};


export function proper(name: string, splitBy?: string) {
    if (name.startsWith("us-")) {
        let split = name.split("-")[1];
        return `US ${split.slice(0, 1).toUpperCase() + `${split.slice(1, split.length).toLowerCase()}`}`
    }
    let str = `${name.slice(0, 1).toUpperCase()}${name.slice(1, name.length).toLowerCase()}`,
        by = (n: string) => str.split(n).map(c => `${c.slice(0, 1).toUpperCase()}${c.slice(1, c.length).toLowerCase()}`).join(" ")
    if (str.includes("_")) return by("_");
    if (str.includes(".")) return by(".");
    if (splitBy && str.includes(splitBy)) return by(splitBy);
    return str;
}

export const ms = {
    get(ms: number, long: boolean = true) {
        return MS(ms, { long });
    },
    convert(seconds: number) {
        if (typeof seconds !== 'number') {
            return "Removed";
        }
        if (seconds === 0) return "Off";
        let days = Math.floor(seconds / (24 * 60 * 60));
        seconds -= days * (24 * 60 * 60);
        let hours = Math.floor(seconds / (60 * 60));
        seconds -= hours * (60 * 60);
        let minutes = Math.floor(seconds / (60));
        seconds -= minutes * (60);
        return `${((0 < days) ? (days + ` Day${days === 1 ? "" : "s"}, `) : "")}${hours === 0 ? "" : `${hours} Hour${hours === 1 ? "" : "s"}${(minutes && seconds) === 0 ? "" : ", "}`}${minutes !== 0 ? `${minutes} Minute${minutes === 1 ? "" : "s"}${seconds === 0 ? "" : ", "}` : ""}${seconds !== 0 ? `${seconds} Second${seconds === 1 ? "" : "s"}` : ""}`;
    }
}

export function getTimeLeft(date: Date | string, type: string) {
    // @ts-ignore
    return moment.duration(new Date(date).getTime() - new Date().getTime()).format(type).toString().startsWith("-");
}

export function getTimeRemaining(date: Date | string, type: string, reverse: boolean = false) {
    // @ts-ignore
    return moment.duration(reverse ? new Date(date).getTime() - new Date().getTime() : new Date().getTime() - new Date(date).getTime()).format(type);
}

export function timeFormat(date: Date | string, discordFormat: boolean = false, format: TimestampStylesString = "f") {
    if (discordFormat) {
        return time(new Date(date), format);
    }
    return `${new Date(date || new Date()).toLocaleString("en-US", times.timeZone ? { timeZone: times.timeZone } : undefined)}${times.short ? ` (${times.short})` : ""}`;
}

export function canTakeActionAgainstMember(mod: GuildMember, member: GuildMember, permissions: PermissionResolvable[]) {
    if (
        !(member instanceof GuildMember) ||
        !(mod instanceof GuildMember) ||
        !Array.isArray(permissions) ||
        !member.guild.members.me ||
        [member.guild.ownerId, member.client.user.id].includes(member.id)
    ) return false;
    if (member.guild.members.me.roles.highest.comparePositionTo(member.roles.highest) < 0) return false;
    if (mod.roles.highest.comparePositionTo(member.roles.highest) < 0) return false;
    if (permissions.some(c => member.permissions.has(c))) return false;
    return true;
}

export async function createBin(title: string, args: string, ext: string = 'js', bin: string = "mine-f", priv: boolean = false) {
    const bins = { 
        mine: "https://haste.elara.services", 
        haste: "https://hastebin.com", 
        pizza: "https://haste.unbelievaboat.com" 
    },
        fetch = async (args: string, url: string, backup: string) => {
            if (!services) {
                return;
            }
            let res = await services.haste.post(args, { extension: ext ?? "js", url }) as { status: boolean, url: string; };
            if (!res.status) {
                res = await services.haste.post(args, { extension: ext ?? "js", url: backup }) as { status: boolean, url: string; };
            }
            return res.status ? res.url : `Unable to create any paste link.`;
        };
    switch (bin) {
        case "mine": case "haste": case "pizza": return fetch(args, bins[bin], bin === "mine" ? bins.haste : bins.mine);
        case "mine-f": {
            let b = await services.paste.post(title, args, priv) as { status: boolean, key: string, id: string; };
            if (b.status && ["messages", "discord"].includes(ext)) return `https://my.elara.services/${ext}/${b.id}`;
            return b.status ? `https://my.elara.services/b/v/${b.key}` : fetch(args, bins.mine, bins.haste)
        }
        default: return fetch(args, bin.match(/http(s)?:\/\//i) ? bin : bins.mine, bins.mine);
    }
}

export const discord = {
    user: async (client: Client, args: string, {
        force, fetch, mock,
    }: DiscordUserOptions): Promise<User | null> => {
        if (!client || !client.isReady() || !args) {
            return null;
        }
        const matches = args.match(/^(?:<@!?)?([0-9]+)>?$/);
        if (!matches) {
            return client.users.cache.find(c => c.tag.toLowerCase().includes(args.toLowerCase())) ?? null;
        }
        const getMock = () => {
            if (mock) {
                // @ts-ignore
                return new User(client, { username: "Unknown User", discriminator: "0000", id: matches[1] });
            }
            return null;
        };
        if (client.users.cache.has(matches[1])) {
            if (force) return client.users.fetch(matches[1], { cache: true, force: true }).catch(() => getMock());
            return client.users.resolve(matches[1]);
        }
        if (!fetch && !mock && !force) return null;
        if (fetch) return client.users.fetch(matches[1], { cache: true, force: true }).catch(() => getMock());
        return getMock();
    },
    role: async (guild: Guild, id: string): Promise<Role | null> => {
        if (!guild?.roles || !id) return null;
        const matches = id.match(/^(?:<@&?)?([0-9]+)>?$/);
        if (!matches) {
            return guild.roles.cache.find(c => c.name.toLowerCase() === id.toLowerCase() || c.name.toLowerCase().includes(id.toLowerCase())) || null;
        }
        return guild.roles.fetch(matches[1], { cache: true }).catch(() => null);
    },
    channel: async (client: Client, id: string, guildToSearch: Guild | null = null): Promise<Channel | null> => {
        if (!client || !id) {
            return null;
        }
        const hm = id.match(/^(?:<#?)?([0-9]+)>?$/);
        if (!hm) {
            if (guildToSearch) {
                return guildToSearch.channels.cache.find(c => c.name.includes(id)) ?? null;
            }
            return null;
        }
        if (client.channels.cache.has(hm[1])) {
            return client.channels.resolve(hm[1]);
        }
        return await client.channels.fetch(hm[1]).catch(() => { }) || null;
    },
    member: async (guild: Guild, args: string, fetch: boolean = false, withPresences: boolean = true): Promise<GuildMember | null> => {
        if (!guild || !args) {
            return null;
        }
        const matches = args.match(/^(?:<@!?)?([0-9]+)>?$/);
        if (!matches) {
            return guild.members.cache.find(c => c.user.tag.toLowerCase().includes(args.toLowerCase())) ?? null;
        }
        let m: GuildMember | null = guild.members.resolve(matches[1]);
        if (!m) {
            if (fetch) {
                m = await guild.members.fetch({
                    user: matches[1],
                    withPresences
                }).catch(() => null);
            }
            if (!m) return null;
        }
        return m;
    }
}

export interface DiscordUserOptions {
    mock?: boolean;
    fetch?: boolean;
    force?: boolean;
}

export function setMobileStatusIcon(deviceType: "iOS" | "Android" = 'iOS') {
    // @ts-ignore
    require("@discordjs/ws").DefaultWebSocketManagerOptions.identifyProperties.browser = `Discord ${deviceType}`;
}

export function field(name: string = "\u200b", value: string = "\u200b", inline = false) {
    return { name, value, inline };
}