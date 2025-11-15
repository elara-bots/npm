import { REST } from "@discordjs/rest";
import { getClientIdFromToken, getPackageStart, is } from "@elara-services/utils";
import pack from "../../package.json";
import { sendOptions } from "../interfaces";
import { addToQueue, sendQueue } from "../queue";
import { _debug, defaultWebhookOptions, disabledLogging, fetchChannel, fetchClient, fetchWebhookInfo, handleFetch } from "../shared";
import { bannedUsernames } from "../utils";

/**
 * @description A Manager for webhooks with only a Discord bot token.
 */
export class Webhook {
    public rest = new REST({
        hashSweepInterval: 0,
        handlerSweepInterval: 0,
    });
    public defaultOptions = { ...defaultWebhookOptions };
    private defs = {
        flags: undefined as number | undefined,
    }
    public constructor(
        private token: string,
    ) {
        if (!is.string(token)) {
            throw new Error(`${getPackageStart(pack)}: No Discord bot 'token' provided when constructing ${this.constructor.name}`);
        }
        this.rest.setToken(token);
    }

    public setFlags(flags: number) {
        this.defs.flags = flags;
        return this;
    }

    public setName(username: string) {
        this.defaultOptions.username = username;
        return this;
    }

    public setAvatar(avatar: string) {
        this.defaultOptions.avatar_url = avatar;
        return this;
    }

    get clientId() {
        return getClientIdFromToken(this.token);
    }

    async send(channelId: string, opt: sendOptions, queue: boolean = true, shouldTransformComponents: boolean = true) {
        if (!channelId) {
            return _debug(`No channelId provided (${channelId})`);
        }
        let channel = await fetchChannel(channelId, this.rest);
        if (!channel) {
            return _debug(`No guild channel found for: ${channelId}`);
        }
        if (channel.guildId && disabledLogging.includes(channel.guildId)) {
            return _debug(`GuildId is in 'disabledLogging' array.`);
        }
        const client = await fetchClient(this.clientId, this.rest);
        if (!client) { // If no client can be fetched then ignore completely.
            return _debug(`No client info could be fetched for (${this.clientId})`);
        }
        let { content, embeds, username, avatar_url: avatarURL, files, components, allowed_mentions, flags } = {
            ...fetchWebhookInfo(opt.webhook, channel.guild, this.defaultOptions),
            embeds: is.array(opt.embeds, false) ? opt.embeds : [],
            content: opt.content ?? null,
            components: opt.components ?? [],
            files: opt.files ?? undefined,
            allowed_mentions: opt.allowed_mentions || undefined,
            flags: this.defs.flags ?? opt.flags ?? undefined,
        }
        const inc = (arr: string[], includes: boolean) => arr.some(c => includes ? username.toLowerCase().includes(c) : username.toLowerCase() === c);
        if (inc(bannedUsernames.includes, true) || inc(bannedUsernames.equals, false)) {
            username = client.user?.username || this.defaultOptions.username;
            avatarURL = client.user?.avatar || this.defaultOptions.avatar_url;
        }
        if (!avatarURL) {
            avatarURL = "";
        }
        if (!content && !embeds?.length && !files?.length && !components?.length) {
            return _debug(`No content (${content?.length || 0}), no embeds (${embeds?.length || 0}), no files (${files?.length || 0}) or no components (${components?.length || 0})`);
        }
        let threadId;
        if (channel.parentId && [10, 11, 12, 15, 16].includes(channel.type)) {
            threadId = channelId;
            channelId = channel.parentId;
        }
        let hook;
        if (is.object(opt.webhook) && is.string(opt.webhook.id) && is.string(opt.webhook.token)) {
            hook = {
                id: opt.webhook.id,
                token: opt.webhook.token,
            }
        }
        if (!hook) {
            hook = await handleFetch(channelId, this.clientId, this.rest)
        }
        if (!hook || !hook.token) {
            return _debug(`No 'hook' found`);
        }
        if (queue === true) {
            return addToQueue(channelId, `${hook.id}/${hook.token}`, {
                // @ts-ignore
                embeds, components, files, webhook: { name: username, icon: avatarURL }, allowed_mentions,
                content,
                flags,
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
            allowed_mentions,
            flags
        }, shouldTransformComponents);
    }
}