import { REST } from "@discordjs/rest";
import { Caching } from "@elara-services/cache";
import { Collection, get, getPackageStart, is, make, snowflakes } from "@elara-services/utils";
import { APIChannel, APIGuild, APIUser, RESTGetAPIChannelWebhooksResult, Routes, type APIWebhook } from "discord-api-types/v10";
import { ButtionIdsFunc, CachedChannel, CachedClient, CachedGuild, CachedOptionType, CachedWebhook, FetchWebhookInfoOption, log } from ".";
import { name, version } from "../package.json";
import { User } from "discord.js";

export let defaultWebhookOptions = {
    username: "Webhook",
    avatar_url: make.emojiURL("815679520296271943", "png")
}

const cached = new Collection<string, { genId: string, expires: number, channelId: string, clientId: string, id: string, token: string }>();
export let disabledLogging = make.array<string>();
export let buttonIds: ButtionIdsFunc | null = null;
export const caching = new Caching();
export let debugLogging = false;
export const rest = new REST();

export async function createWebhook(client: REST, id = "", name: string) {
    if (!id) {
        return null;
    }
    const res = await client.post(
        Routes.channelWebhooks(id),
        {
            reason: "Created for logging purposes",
            body: { name }
        }
    ).catch((e) => new Error(e)) as APIWebhook | Error;
    if (res instanceof Error) {
        log(`[WEBHOOK:CREATE:ERROR]: `, res);
        return null;
    }
    if (res.id && res.token) {
        await caching.handler.set(id, { id: res.id, token: res.token }, "webhooks");
        return res;
    }
    return null;
}

export function getComponents(components: any[] | unknown, shouldTransform = true) {
    if (!is.array(components)) {
        return;
    }
    if (components.length >= 2 && buttonIds && shouldTransform) {
        let list = components.flatMap((c: any) => c.components);
        components = buttonIds([...new Set(list.filter(c => [2, "Button"].includes(c.type)).map(c => (c.custom_id || c.data?.customId || c.customId || "").split(":")[1]))].map(c => ({ id: c })), true);
    }
    return components as unknown[];
}

export function _debug(...args: unknown[]) {
    if (!debugLogging) {
        return;
    }
    log(`${getPackageStart({ name, version })}: DEBUGGER`, ...args);
}

export const setup = {
    debug: (toggle: boolean) => {
        debugLogging = toggle;
    },
    buttonIds: (func: ButtionIdsFunc) => {
        buttonIds = func;
    },
    ignoreGuildId: (id: string) => {
        if (disabledLogging.includes(id)) {
            disabledLogging = disabledLogging.filter(c => c !== id);
            return `Removed (${id}) from the 'disabledLogging' array.`;
        }
        disabledLogging.push(id);
        return `Added (${id}) to the 'disabledLogging' array.`;
    }
}

export async function handleFetch(channelId: string, clientId: string, rest: REST) {
    if (!channelId) {
        return null;
    }
    const w = await caching.handler.get<CachedWebhook, CachedOptionType>(`${channelId}_${clientId}`, "webhooks");
    if (w) {
        return w;
    }
    let hook = (await fetchWebhooks(channelId, clientId, rest, true, true))?.[0] ?? null;
    if (!hook) {
        hook = await createWebhook(rest, channelId, `Elara Services (Webhooks)`);
    }
    if (!hook || !hook.id || !hook.token) {
        return null;
    }
    const data = { id: hook.id, token: hook.token };
    await caching.handler.set(`${channelId}_${clientId}`, data, "webhooks");
    return data as CachedWebhook;
}

export async function fetchChannel(channelId: string, rest: REST) {
    const channel = await caching.handler.get<CachedChannel, CachedOptionType>(channelId, "channels");
    if (channel) {
        if (channel.invalid) {
            _debug(`'fetchChannel' the 'channel' is invalid, ignoring`);
            return null;
        }
        return channel;
    }
    const res = await rest.get(Routes.channel(channelId)).catch((e: unknown) => e) as APIChannel | Error;
    if (!res || res instanceof Error) {
        await caching.handler.set(channelId, { id: channelId, invalid: true, type: 0 }, "channels", get.hrs(2));
        _debug(`ChannelId (${channelId}) had an error while fetching`, res);
        return null;
    }
    let data: CachedChannel = {
        id: channelId,
        invalid: false,
        type: res.type,
    }
    if ('guild_id' in res && res.guild_id) {
        data.guildId = res.guild_id;
        data.guild = await fetchGuild(res.guild_id, rest);
    }
    if ("parent_id" in res && res.parent_id) {
        data.parentId = res.parent_id;
    }
    await caching.handler.set(channelId, data, "channels", get.mins(15));
    return data;
}

export async function fetchGuild(guildId: string, rest: REST) {
    const guild = await caching.handler.get<CachedGuild, CachedOptionType>(guildId, "guilds");
    if (guild) {
        if (guild.invalid) {
            _debug(`'fetchGuild' the 'guild' is invalid, ignoring`);
            return null;
        }
        return guild;
    }
    const res = await rest.get(Routes.guild(guildId)).catch((e: unknown) => e) as APIGuild | Error;
    if (!res || res instanceof Error) {
        await caching.handler.set<CachedGuild, CachedOptionType>(guildId, { id: guildId, invalid: true }, "guilds", get.hrs(2));
        _debug(`GuildId (${guildId}) had an error while fetching`, res);
        return null;
    }
    return await cacheGuild({
        id: res.id,
        invalid: false,
        name: res.name,
        icon: res.icon,
    });
}

export async function fetchClient(clientId: string, rest: REST) {
    const client = await caching.handler.get<CachedClient, CachedOptionType>(clientId, "client");
    if (client) {
        if (client.invalid) {
            _debug(`'fetchClient' the 'client' is invalid, ignoring`);
            return null;
        }
        return client;
    }
    const res = await rest.get(Routes.user()).catch((e: unknown) => e) as APIUser | Error;
    if (!res || res instanceof Error) {
        await caching.handler.set<CachedClient, CachedOptionType>(clientId, { id: clientId, invalid: true }, "client", get.hrs(2));
        _debug(`Client (${clientId}) had an error while fetching`, res);
        return null;
    }
    const data: CachedClient = {
        id: res.id,
        invalid: false,
        user: {
            username: res.username,
            discriminator: res.discriminator,
            avatar: make.image.users.avatar(res.id, res.avatar || undefined)
        }
    };
    await caching.handler.set(clientId, data, "client", get.hrs(1));
    return data;
}

export function fetchWebhookInfo(opt: FetchWebhookInfoOption, guild?: CachedGuild | null, defaultWebhook: typeof defaultWebhookOptions = defaultWebhookOptions) {
    let icon = opt?.icon;
    if (!icon) {
        if (guild?.icon && !guild.icon.startsWith("https://")) {
            icon = make.image.guild.icon(guild.id, guild.icon, true, "png");
        }
    }
    return {
        username: opt?.name || guild?.name || defaultWebhook?.username,
        avatar_url: icon || defaultWebhook.avatar_url,
    };
}

/**
 * @description Caches guild data for X amount of time.
 */
export async function cacheGuild(data: CachedGuild, ttl = get.hrs(1)): Promise<CachedGuild> {
    let icon = null;
    if (data.icon) {
        if (data.icon.match(/https:\/\/(cdn.discordapp.com|media.discordapp.net)/gi)) {
            icon = data.icon;
        } else {
            icon = make.image.guild.icon(data.id, data.icon, true, "png");
        }
    }
    if (icon && !icon.match(/https:\/\//gi)) {
        icon = null;
    }
    const cache: CachedGuild = {
        name: data.name || "Unknown Server",
        id: data.id,
        invalid: data.invalid || false,
        icon,
    };
    await caching.handler.set(data.id, cache, "guilds", ttl);
    return cache;
}

export async function fetchWebhooks(
    channelId: string,
    clientId: string,
    rest: REST,
    onlyClient = true,
    withTokens = true,
): Promise<APIWebhook[] | null> {
    let hooks = await rest.get(Routes.channelWebhooks(channelId)).catch(() => null) as RESTGetAPIChannelWebhooksResult | null;
    if (!hooks || !is.array(hooks)) {
        return null;
    }
    if (withTokens) {
        hooks = hooks.filter((c) => c.token && is.string(c.token));
    }
    if (onlyClient && is.string(clientId)) {
        hooks = hooks.filter((c) => c.user?.id === clientId && c.token);
    }

    return is.array(hooks) ? hooks : null;
}

export function clearCachedWebhooks() {
    for (const c of cached.values()) {
        if (Date.now() < c.expires) {
            cached.delete(c.genId);
        }
    }
}

export async function fetchRandomWebhook(
    clientId: string,
    channelId: string,
    rest: REST,
    force = false,
) {
    await clearCachedWebhooks();
    if (!force && cached.size) {
        return cached.random();
    }
    let res = await fetchWebhooks(channelId, clientId, rest);
    if (!res) {
        const r = await createWebhook(rest, channelId, `Elara Services (Webhooks)`);
        if (r) {
            res = [r];
        }
    }
    if (!res) {
        return null;
    }

    for (const c of res) {
        const id = snowflakes.generate();
        cached.set(id, {
            genId: id,
            id: c.id,
            token: c.token as string,
            channelId,
            clientId,
            expires: Date.now() + get.hrs(2)
        })
    }
    return cached.random();
}