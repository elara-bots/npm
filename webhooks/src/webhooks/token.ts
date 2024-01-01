import { REST } from "@discordjs/rest";
import { getClientIdFromToken } from "@elara-services/utils";
import {
    Routes,
    type APIChannel,
    type RESTGetAPIChannelWebhooksResult,
} from "discord-api-types/v10";
import {
    _debug,
    addToQueue,
    bannedUsernames,
    channels,
    createWebhook,
    disabledLogging,
    sendQueue,
    throwError,
    webhooks,
    type CachedChannel,
    type sendOptions
} from "..";

export let defaultWebhookOptions = {
    username: "Webhook",
    avatar_url: "https://cdn.discordapp.com/emojis/1059556038761787433.png"
}

export class Webhook {
    private clientId: string | undefined;
    private rest: REST;
    public constructor(botToken: string) {
        if (!botToken || typeof botToken !== "string") {
            throwError(`You provided either no botToken in the constructor or it's not a string.`);
        }
        this.clientId = getClientIdFromToken(botToken);
        if (!this.clientId || typeof this.clientId !== "string") {
            throwError(`You didn't provide a valid botToken.`);
        }
        this.rest = new REST()
        .setToken(botToken);
    }

    fetchWebhookInfo(opt: {
        name?: string | null | undefined;
        icon?: string | null | undefined;
    } | null | undefined) {
        return { 
            username: opt?.name || defaultWebhookOptions.username, 
            avatar_url: opt?.icon || defaultWebhookOptions.avatar_url 
        };
    }

    async fetch(channelId: string) {
        if (!channelId) {
            return null;
        }
        const w = webhooks.get(channelId);
        if (w) {
            return w;
        }
        const hooks: RESTGetAPIChannelWebhooksResult | unknown = await this.rest.get(Routes.channelWebhooks(channelId)).catch(() => null);
        let hook = null;
        if (Array.isArray(hooks) && hooks.length) {
            hook = hooks.find(c => c.user?.id === this.clientId && c.token);
        }
        if (!hook) {
            hook = await createWebhook(this.rest, channelId, defaultWebhookOptions.username);
        }
        if (!hook || !hook.token) {
            return null;
        }
        const data = {
            id: hook.id,
            token: hook.token,
        };
        webhooks.set(channelId, data);
        return data;
    }

    async send(channelId: string, opt: sendOptions, queue: boolean = true, shouldTransformComponents: boolean = true) {
        if (!channelId) {
            return _debug(`No channelId provided`, channelId);
        }
        const channel = await this.fetchChannel(channelId);
        if (!channel) {
            return _debug(`No 'channel' found`, channelId);
        }
        if (channel.guildId && disabledLogging.includes(channel.guildId)) {
            return _debug(`'channel.guildId' (${channel.guildId}) is ignored`, disabledLogging.includes(channel.guildId));
        }
        let finalChannelId = channelId;
        let { content, embeds, username, avatar_url: avatarURL, files, components } = {
            ...this.fetchWebhookInfo(opt.webhook),
            embeds: (opt.embeds && Array.isArray(opt.embeds)) ? opt.embeds : [], 
            content: opt.content ?? null,
            components: opt.components ?? [],
            files: opt.files ?? undefined
        }
        const inc = (arr: string[], includes: boolean) => arr.some(c =>  includes ? username.toLowerCase().includes(c) : username.toLowerCase() === c);
        if (inc(bannedUsernames.includes, true) || inc(bannedUsernames.equals, false)) {
            username = defaultWebhookOptions.username;
            avatarURL = defaultWebhookOptions.avatar_url;
        }
        if (!avatarURL) {
            avatarURL = "";
        }
        if (!content && !embeds.length) {
            return _debug(`No content (${content?.length || 0}) or no embeds (${embeds.length || 0})`);
        }
        let threadId;
        if (channel.parentId && [10, 11, 12, 15, 16].includes(channel.type)) {
            threadId = channelId;
            finalChannelId = channel.parentId;
        }
        const hook = await this.fetch(finalChannelId);
        if (!hook) {
            return _debug(`No 'hook' found`, hook);
        }
        if (queue === true) {
            return addToQueue(finalChannelId, `${hook.id}/${hook.token}`, {
                embeds, components, webhook: { name: username, icon: avatarURL }, files
            }, threadId);
        }
        return sendQueue(hook.id, hook.token, {
            embeds, components,
            files,
            threadId,
            username,
            avatarURL,
            channelId,
        }, shouldTransformComponents);
    }

    private async fetchChannel(channelId: string): Promise<CachedChannel | null> {
        const channel = channels.get(channelId);
        if (channel) {
            if (channel.invalid) {
                _debug(`'fetchChannel' the 'channel' is invalid, ignoring`);
                return null;
            }
            return channel;
        }
        const res = await this.rest.get(Routes.channel(channelId)).catch((e: unknown) => e) as APIChannel | Error;
        if (!res || res instanceof Error) {
            channels.set(channelId, { id: channelId, invalid: true, type: 0 });
            _debug(`ChannelId (${channelId}) had an error while fetching`, res);
            return null;
        }
        let data: CachedChannel = {
            id: channelId,
            invalid: false,
            type: res.type,
        }
        if ('guild_id' in res) {
            data.guildId = res.guild_id;
        }
        if ("parent_id" in res) {
            data.parentId = res.parent_id as string;
        }
        channels.set(channelId, data);
        return data;
    }
}