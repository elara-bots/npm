import { REST } from "@discordjs/rest";
import type {
    Channel,
    Client,
    Guild,
    Webhook
} from "discord.js";
import {
    _debug,
    addToQueue,
    bannedUsernames,
    createWebhook,
    disabledLogging,
    sendQueue,
    throwError,
    type sendOptions,
    caching,
    CachedWebhook
} from "..";

export class GuildWebhook {
    public guild: Guild;
    private client: Client<true>;
    private rest: REST;
    public constructor(guild: Guild) {
        if (!guild) {
            throwError(`You provided either no guild in the constructor`)
        }
        this.guild = guild;
        this.client = guild.client;
        this.rest = new REST()
            .setToken(guild.client.token);
    }

    fetchWebhookInfo(opt: {
        name?: string | null | undefined;
        icon?: string | null | undefined;
    } | null | undefined) {
        let def = { username: this.guild.name, avatar_url: this.guild.icon ? this.guild.iconURL() : `https://cdn.discordapp.com/emojis/847624594717671476.png` };
        if (opt) return { username: opt?.name || def.username, avatar_url: opt?.icon || def.avatar_url }
        return def;
    }
    async fetch(channel: Channel) {
        if (!channel?.id || !('fetchWebhooks' in channel)) {
            return null;
        }
        const w = await caching.handler.get<CachedWebhook>(`${channel.id}_${this.guild.client.user.id}`, "webhooks");
        if (w) {
            return w;
        }
        const hooks = await channel.fetchWebhooks().catch(() => null);
        let hook = null;
        if (hooks?.size) {
            hook = hooks.find((c: Webhook) => c.owner?.id === this.client.user.id && c.token);
        }
        if (!hook) {
            hook = await createWebhook(this.rest, channel.id, `${this.client.user.username} Services`);
        }
        if (!hook || !hook.token) {
            return null;
        }
        const data = { id: hook.id, token: hook.token };
        await caching.handler.set(`${channel.id}_${this.guild.client.user.id}`, data, "webhooks");
        return data as CachedWebhook;
    }

    async send(channelId: string, opt: sendOptions, queue: boolean = true, shouldTransformComponents: boolean = true) {
        if (!channelId || !this.disabled) {
            return _debug(`No channelId provided (${channelId}) or 'this.disabled' is false (${this.disabled})`);
        }
        let channel = this.guild.channels.resolve(channelId);
        if (!channel) {
            return _debug(`No guild channel found for: ${channelId}`);
        }
        let { content, embeds, username, avatar_url: avatarURL, files, components, allowed_mentions } = {
            ...this.fetchWebhookInfo(opt.webhook),
            embeds: (opt.embeds && Array.isArray(opt.embeds)) ? opt.embeds : [],
            content: opt.content ?? null,
            components: opt.components ?? [],
            files: opt.files ?? undefined,
            allowed_mentions: opt.allowed_mentions || undefined,
        }
        const inc = (arr: string[], includes: boolean) => arr.some(c => includes ? username.toLowerCase().includes(c) : username.toLowerCase() === c);
        if (inc(bannedUsernames.includes, true) || inc(bannedUsernames.equals, false)) {
            username = this.client.user.username;
            avatarURL = this.client.user.displayAvatarURL();
        }
        if (!avatarURL) {
            avatarURL = "";
        }
        if (!content && !embeds.length) {
            return _debug(`No content (${content?.length || 0}), or no embeds (${embeds.length || 0})`);
        }
        let threadId;
        if (channel.isThread() || ["GUILD_FORUM", "GuildForum", 15].includes(channel.type)) {
            let parent = channel.parent;
            if (parent) {
                threadId = channel.id;
                channel = parent;
            } else if (channel.parentId) {
                const p = this.guild.channels.resolve(channel.parentId) || await this.guild.channels.fetch(channel.parentId, { cache: true }).catch(() => { });
                if (p) {
                    threadId = channel.id;
                    channel = p;
                }
            }
        }
        const hook = await this.fetch(channel);
        if (!hook || !hook.token) {
            return _debug(`No 'hook' found`);
        }
        if (queue === true) {
            return addToQueue(channel.id, `${hook.id}/${hook.token}`, {
                embeds, components, files, webhook: { name: username, icon: avatarURL }, allowed_mentions,
                content,
            }, threadId);
        }
        return sendQueue(hook.id, hook.token, {
            embeds, components,
            threadId,
            username,
            files,
            avatarURL,
            channelId,
            content,
            allowed_mentions
        }, shouldTransformComponents);
    }

    get disabled() {
        if (!this.guild || !this.guild.available || disabledLogging.includes(this.guild.id)) {
            return false;
        }
        return true;
    }
}