import { getClientIdFromToken } from "@elara-services/utils";
import {
    Routes,
    type APIChannel,
    type RESTGetAPIChannelWebhooksResult,
} from "discord-api-types/v10";
import {
    addToQueue,
    bannedUsernames,
    channels,
    createWebhook,
    disabledLogging,
    rest,
    sendQueue,
    throwError,
    webhooks,
    type CachedChannel,
    type sendOptions
} from ".";

export let defaultWebhookOptions = {
    username: "Webhook",
    avatar_url: "https://cdn.discordapp.com/emojis/1059556038761787433.png"
}

export class Webhook {
    private clientId: string | undefined;
    public constructor(botToken: string) {
        if (!botToken || typeof botToken !== "string") {
            throwError(`You provided either no botToken in the constructor or it's not a string.`);
        }
        this.clientId = getClientIdFromToken(botToken);
        if (!this.clientId || typeof this.clientId !== "string") {
            throwError(`You didn't provide a valid botToken.`);
        }
        rest.setToken(botToken);
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
        const hooks: RESTGetAPIChannelWebhooksResult | unknown = await rest.get(Routes.channelWebhooks(channelId)).catch(() => null);
        let hook = null;
        if (Array.isArray(hooks) && hooks.length) {
            hook = hooks.find(c => c.user?.id === this.clientId && c.token);
        }
        if (!hook) {
            hook = await createWebhook(rest, channelId, defaultWebhookOptions.username);
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

    async send(channelId: string, opt: sendOptions, queue: boolean = true) {
        if (!channelId) {
            return;
        }
        const channel = await this.fetchChannel(channelId);
        if (!channel) {
            return;
        }
        if (channel.guildId && disabledLogging.includes(channel.guildId)) {
            return;
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
            return;
        }
        let threadId;
        if (channel.parentId) {
            threadId = channelId;
            finalChannelId = channel.parentId;
        }
        const hook = await this.fetch(finalChannelId);
        if (!hook) {
            return;
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
        });
    }

    private async fetchChannel(channelId: string): Promise<CachedChannel | null> {
        const channel = channels.get(channelId);
        if (channel) {
            if (channel.invalid) {
                return null;
            }
            return channel;
        }
        const res = await rest.get(Routes.channel(channelId)).catch((e) => e) as APIChannel | Error;
        if (!res || res instanceof Error) {
            channels.set(channelId, { id: channelId, invalid: true, type: 0 });
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