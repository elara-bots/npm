import {
    REST,
    makeURLSearchParams,
    type RawFile,
    type RequestData
} from "@discordjs/rest";

import {
    Routes,
    type APIEmoji,
    type APIGuild,
    type APIGuildPreview,
    type APIMessage,
    type RESTDeleteAPIChannelResult,
    type RESTGetAPIApplicationCommandResult,
    type RESTGetAPIChannelInvitesResult,
    type RESTGetAPIChannelPinsResult,
    type RESTGetAPIChannelResult,
    type RESTGetAPIChannelWebhooksResult,
    type RESTGetAPIGuildMemberResult,
    type RESTGetAPIInviteResult,
    type RESTPatchAPIChannelJSONBody,
    type RESTPatchAPIGuildMemberJSONBody,
    type RESTPostAPIChannelFollowersResult,
    type RESTPostAPIChannelInviteResult,
    type RESTPostAPIChannelMessageJSONBody,
    type RESTPostAPIChannelTypingResult,
    type RESTPostAPIChannelWebhookJSONBody,
    type RESTPostAPIInteractionCallbackJSONBody,
    type RESTPutAPIGuildBanJSONBody,
} from "discord-api-types/v10";

import { type Client } from "discord.js";

export type RequestMethod = "get" | "post" | "patch" | "delete" | "put";

export class RestClient {
    public client: Client<true>;
    public rest: REST;
    public constructor(client: Client<true>) {
        this.client = client;
        if ("setToken" in this.client.rest) {
            this.rest = this.client.rest;
        } else {
            this.rest = new REST({ offset: 100 })
            .setToken(client.token as string);
        }
    }

    public get invites() {
        return {
            get: (code: string) => this.request<RESTGetAPIInviteResult>(Routes.invite(code))
        }
    }
    public get members() {
        return {
            get: (guildId: string, userId: string) => this.request<RESTGetAPIGuildMemberResult>(Routes.guildMember(guildId, userId)),
            edit: (guildId: string, userId: string, body: RESTPatchAPIGuildMemberJSONBody, reason?: string) => this.request<RESTGetAPIGuildMemberResult>(Routes.guildMember(guildId, userId), "patch", { body, reason }),
            bans: {
                add: (guildId: string, userId: string, body: RESTPutAPIGuildBanJSONBody, reason?: string) => this.request(Routes.guildBan(guildId, userId), "put", { body, reason }),
                remove: (guildId: string, userId: string, reason?: string) => this.request(Routes.guildBan(guildId, userId), "delete", { reason })
            }
        }
    }

    public get applications() {
        return {
            rpc: (id: string) => this.request(`/applications/${id}/rpc`, "get", { auth: false }),
            assets: (id: string) => this.request(`/applications/${id}/assets`)
        }
    }

    public get interactions() {
        return {
            callback: (id: string, token: string, body: RESTPostAPIInteractionCallbackJSONBody) => {
                return this.noAuthRequest(Routes.interactionCallback(id, token), "post", { body })
            },
            guilds: (guildId: string, body: RequestData, put = true) => this.request<RESTGetAPIApplicationCommandResult[]>(Routes.applicationGuildCommands(this.client.user.id, guildId), put ? "put" : "post", body),
            application: (body: RequestData, put = true) => this.request<RESTGetAPIApplicationCommandResult[]>(Routes.applicationCommands(this.client.user.id), put ? "put" : "post", body),
            commands: {
                fetch: (guildId?: string) => this.request<RESTGetAPIApplicationCommandResult[]>(guildId ? Routes.applicationGuildCommands(this.client.user.id, guildId) : Routes.applicationCommands(this.client.user.id))
            }

        }
    }

    public get webhooks() {
        return {
            messages: {
                create: ({ id, token, files }: { id: string, token: string, files: RawFile[] }, body: RESTPostAPIChannelMessageJSONBody & { threadId?: string, thread_id?: string }) => {
                    const thread_id = body?.threadId || body?.thread_id;
                    delete body.threadId;
                    delete body.thread_id; 
                    return this.request<APIMessage>(Routes.webhook(id, token), "post", {
                        body,
                        files,
                        auth: false,
                        query: makeURLSearchParams({
                            wait: true,
                            thread_id,
                        })
                    });
                },
                edit: ({ id, token, messageId = "@original" }: { id?: string, token: string, messageId: string }, body: RequestData['body']) => {
                    return this.request<APIMessage>(Routes.webhookMessage(id ?? this.client.user.id, token, messageId), "patch", { body, auth: false });
                }
            }
        }
    }

    public get channels() {
        return {
            get: (id: string) => this.request<RESTGetAPIChannelResult>(Routes.channel(id)),
            edit: (id: string, body: RESTPatchAPIChannelJSONBody, reason?: string) => this.request<RESTGetAPIChannelResult>(Routes.channel(id), "patch", {
                body,
                reason
            }),
            webhooks: {
                fetch: (id: string) => this.request<RESTGetAPIChannelWebhooksResult>(Routes.channelWebhooks(id)),
                post: (id: string, body: RESTPostAPIChannelWebhookJSONBody, reason?: string) => this.request(Routes.channelWebhooks(id), "post", { body, reason }),
            },
            delete: (id: string, reason?: string) => this.request<RESTDeleteAPIChannelResult>(Routes.channel(id), "delete", { reason }),
            typing: (id: string) => this.request<RESTPostAPIChannelTypingResult>(Routes.channelTyping(id), "post"),
            followers: (channelId: string, followingChannelId: string, reason?: string) => this.request<RESTPostAPIChannelFollowersResult>(Routes.channelFollowers(channelId), "post", {
                body: { webhook_channel_id: followingChannelId },
                reason,
            }),
            messages: {
                create: (id: string, body: RequestData["body"]) => this.request<APIMessage>(Routes.channelMessages(id), "post", { body }),
                search: (id: string, query: {
                    around?: string;
                    before?: string;
                    after?: string;
                    limit?: number;
                }) => this.request<APIMessage[]>(Routes.channelMessages(id), "get", { query: makeURLSearchParams(query) }),
                fetch: (id: string, messageId: string) => this.request<APIMessage>(Routes.channelMessage(id, messageId)),
                crosspost: (id: string, messageId: string) => this.request<APIMessage>(Routes.channelMessageCrosspost(id, messageId), "post"),
                edit: (id: string, messageId: string, body: RequestData["body"]) => this.request(Routes.channelMessage(id, messageId), "patch", { body }),
                delete: (id: string, messageId: string) => this.request(Routes.channelMessage(id, messageId), "delete"),
                bulk: (id: string, messages: string[], reason: string) => this.request(Routes.channelBulkDelete(id), "post", {
                    reason, 
                    body: { messages }
                })
            },

            reactions: {
                create: (id: string, messageId: string, emoji: string) => this.request(Routes.channelMessageOwnReaction(id, messageId, emoji), "put"),
                fetch: (id: string, messageId: string, emoji: string, query: {
                    after?: string;
                    limit?: number
                }) => this.request(Routes.channelMessageReaction(id, messageId, emoji), "get", {
                    query: makeURLSearchParams(query)
                }),
                delete: {
                    me: (id: string, messageId: string, emoji: string) => this.request(Routes.channelMessageOwnReaction(id, messageId, emoji), "delete"),
                    all: (id: string, messageId: string, emoji?: string) => this.request(emoji ? Routes.channelMessageReaction(id, messageId, emoji) : Routes.channelMessageAllReactions(id, messageId), "delete"),
                    user: (id: string, messageId: string, userId: string, emoji: string) => this.request(Routes.channelMessageUserReaction(id, messageId, emoji, userId), "delete")
                },

            },

            invites: {
                create: (channelId: string, body: RequestData["body"], reason: string) => this.request<RESTPostAPIChannelInviteResult>(Routes.channelInvites(channelId), "post", { body, reason }),
                fetch: (channelId: string) => this.request<RESTGetAPIChannelInvitesResult>(Routes.channelInvites(channelId)),
            },

            pins: {
                create: (channelId: string, messageId: string) => this.request(Routes.channelPin(channelId, messageId)),
                fetch: (channelId: string) => this.request<RESTGetAPIChannelPinsResult>(Routes.channelPins(channelId)),
                delete: (channelId: string, messageId: string, reason: string) => this.request(Routes.channelPin(channelId, messageId), "delete", { reason }),
            },

            threads: {
                join: (threadId: string, userId = "@me") => this.request(Routes.threadMembers(threadId, userId)),
                create: (parentId: string, messageId?: string, body?: RequestData['body']) => this.request(Routes.threads(parentId, messageId), "post", { body }),
                delete: (threadId: string, userId = "@me") => this.request(Routes.threadMembers(threadId, userId), "delete"),
                search: {
                    all: (threadId: string) => this.request(Routes.threadMembers(threadId)),
                    user: (threadId: string, userId: string) => this.request(Routes.threadMembers(threadId, userId)),
                }
            },
        }
    }

    public get emojis() {
        return {
            create: (guildId: string, body: { name: string, image: RawFile['data'], roles?: string[]}, reason: string) => this.request<APIEmoji>(Routes.guildEmojis(guildId), "post", { body, reason }),
            edit: (guildId: string, emojiId: string, body: { name?: string, roles?: string[] }, reason: string) => this.request<APIEmoji>(Routes.guildEmoji(guildId, emojiId), "patch", { body, reason }),
            fetch: (guildId: string, emojiId?: string) => this.request<APIEmoji | APIEmoji[]>(emojiId ? Routes.guildEmoji(guildId, emojiId) : Routes.guildEmojis(guildId)),
            delete: (guildId: string, emojiId: string, reason: string) => this.request(Routes.guildEmoji(guildId, emojiId), "delete", { reason }),
        }
    }

    public get guilds() {
        return {
            create: (body: RequestData) => this.request<APIGuild>(Routes.guilds(), "post", body),
            fetch: (id: string, query = { with_counts: true }) => this.request<APIGuild>(Routes.guild(id), "get", { query: makeURLSearchParams(query) }),
            preview: (id: string) => this.request<APIGuildPreview>(Routes.guildPreview(id)),
            edit: (id: string, body: RequestData['body'], reason: string) => this.request<APIGuild>(Routes.guild(id), "patch", { body, reason }),
            delete: (id: string) => this.request(Routes.guild(id), "delete")
        }
    }

    private request<T>(endpoint: `/${string}`, method: RequestMethod = "get", data?: RequestData): Promise<T | null> {
        if (data?.query) {
            data.query = makeURLSearchParams(data.query);
        }
        return this.rest[method](endpoint, data).catch(() => null) as Promise<T | null>;
    }

    private noAuthRequest<T>(endpoint: `/${string}`, method: RequestMethod = "get", data: RequestData = {}) {
        return this.request<T>(endpoint, method, {
            ...data,
            auth: false,
        });
    }
}