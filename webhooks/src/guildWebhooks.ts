import {
    ChannelType,
    Guild,
    type Channel,
    type PermissionResolvable,
} from "discord.js";
import {
    addToQueue,
    createWebhook,
    disabledLogging,
    sendQueue,
    throwError,
    webhooks,
    type sendOptions,
} from ".";

export class GuildWebhook {
    public guild: Guild;
    public constructor(guild: Guild) {
        if (!guild || !(guild instanceof Guild)) {
            throwError(`You provided either no guild in the constructor or it's not an instanceof DiscordJS.Guild`)
        }
        this.guild = guild;
    }
    fetchWebhookInfo(opt: {
        name?: string | null | undefined;
        icon?: string | null | undefined;
    } | null | undefined) {
        let def = { username: this.guild.name, avatar_url: this.guild.icon ? this.guild.iconURL() : `${this.guild.client.options.rest?.cdn}/emojis/847624594717671476.png` };
        if (opt) return { username: opt?.name || def.username, avatar_url: opt?.icon || def.avatar_url } 
        return def;
    }
    async fetch(channel: Channel) {
        if (!channel?.id || !('fetchWebhooks' in channel)) {
            return null;
        }
        const w = webhooks.get(channel.id);
        if (w) {
            return w;
        }
        const hooks = await channel.fetchWebhooks().catch(() => null);
        let hook = null;
        if (hooks?.size) {
            hook = hooks.find(c => c.owner?.id === this.guild.client.user.id && c.token);
        }
        if (!hook) {
            hook = await createWebhook(this.guild.client.rest, channel.id, `${this.guild.client.user.username} Services`);
        }
        if (!hook || !hook.token) {
            return null;
        }
        const data = { id: hook.id, token: hook.token };
        webhooks.set(channel.id, data);
        return data;
    }

    async send(channelId: string, opt: sendOptions, queue: boolean = true) {
        if (!channelId || !this.disabled || !this.checkChannelPermissions(channelId)) {
            return;
        }
        let channel = this.guild.channels.resolve(channelId);
        if (!channel) {
            return;
        }
        let { content, embeds, username, avatar_url: avatarURL, files, components } = {
            ...this.fetchWebhookInfo(opt.webhook),
            embeds: (opt.embeds && Array.isArray(opt.embeds)) ? opt.embeds : [], 
            content: opt.content ?? null,
            components: opt.components ?? [],
            files: opt.files ?? undefined
        }
        if (username.toLowerCase().includes("discord")) {
            username = this.guild.client.user.username;
            avatarURL = this.guild.client.user.displayAvatarURL();
        }
        if (!avatarURL) {
            avatarURL = "";
        }
        if (!content && !embeds.length) {
            return;
        }
        let threadId;
        if (channel.isThread() || channel.type === ChannelType.GuildForum) {
            let parent = channel.parent;
            if (parent) {
                threadId = channel.id;
                channel = parent;
            } else if (channel.parentId) {
                const p = this.guild.channels.resolve(channel.parentId) || await this.guild.channels.fetch(channel.parentId, { cache: true }).catch(() => {});
                if (p) {
                    threadId = channel.id;
                    channel = p;
                }
            }
        }
        const hook = await this.fetch(channel);
        if (!hook) {
            return;
        }
        if (queue === true) {
            return addToQueue(channel.id, `${hook.id}/${hook.token}`, {
                embeds, components, files, webhook: { name: username, icon: avatarURL },
            }, threadId);
        }
        return sendQueue(hook.id, hook.token, {
            embeds, components,
            threadId,
            username,
            files,
            avatarURL,
        });
    }

    checkGlobalPermissions(perms: PermissionResolvable[] = [
        "ViewAuditLog",
        "ManageWebhooks",
    ]) {
        if (!this.disabled) {
            return false;
        }
        return this.guild.members.me?.permissions.has(perms) ?? false;
    }

    checkChannelPermissions(channelId: string, checkGlobal: boolean = false, permissions: PermissionResolvable[] = [
        "ViewChannel",
        "ManageWebhooks",
    ]) {
        if (!this.disabled) {
            return false;
        }
        if (checkGlobal && !this.checkGlobalPermissions()) {
            return false;
        }
        const channel = this.guild.channels.resolve(channelId);
        if (!channel || !("fetchWebhooks" in channel) || !("permissionsFor" in channel)) {
            return false;
        }
        return channel.permissionsFor(this.guild.client.user.id)?.has(permissions) ?? false;
    }

    get disabled() {
        if (!this.guild || !this.guild.available || disabledLogging.includes(this.guild.id)) {
            return false;
        }
        return true;
    }
}