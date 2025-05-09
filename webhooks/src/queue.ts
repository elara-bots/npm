import { ActionRowBuilder, EmbedBuilder, embedLength } from "@discordjs/builders";
import { makeURLSearchParams, type RawFile } from "@discordjs/rest";
import { chunk, get, is, make } from "@elara-services/utils";
import { APIEmbed, Routes, type APIMessage } from "discord-api-types/v10";
import { _debug, caching, getComponents, rest, sendOptions, throwError } from ".";
export const queue = make.array<QueueOptions>();
export const disabled = make.array<string>();
export let queueInterval: NodeJS.Timer | null = null;
export type AnyEmbed = EmbedBuilder | APIEmbed;

export let handlers = {
    afterWebhookSent: (message: APIMessage) => {
        _debug(`[WEBHOOK:MESSAGE:SENT]: `, message);
        return;
    },
    errorWebhookSend: (error: unknown, data: QueueSendBody) => {
        _debug(`[WEBHOOK:MESSAGE:ERROR]: `, error, data);
        return;
    }
}

export function addToQueue(channelId: string, webhook: string, opts: QueueOptions['opts'], threadId: string | undefined) {
    _debug(`Added (${channelId}) to the queue with webhook (${webhook}${threadId ? `?thread_id=${threadId}` : ""})`, opts);
    queue.push({
        channelId,
        webhook,
        opts,
        threadId,
    });
}

export async function run() {
    if (!queue.length) {
        _debug(`No queue (${queue.length}), ignoring.`)
        return;
    }
    let channels: Record<string, {
        embeds: AnyEmbed[];
        content?: string | null;
        flags?: number;
        components: ActionRowBuilder<any>[];
        files: RawFile[];
        channelId: string;
        webhook: string;
        threadId?: string;
        name?: string;
        icon?: string;
        allowed_mentions?: sendOptions['allowed_mentions'];
    }> = {};
    for (const que of queue.filter(c => !disabled.includes(c.channelId))) {
        let { channelId, webhook, threadId, opts: { embeds, components, webhook: wb, files, content, allowed_mentions } } = que;
        if (!webhook) {
            _debug(`No 'webhook' url found, ignoring.`);
            continue;
        }
        if (!is.array(embeds, false)) {
            embeds = [];
        }
        if (!is.array(components, false)) {
            components = [];
        }
        if (!is.array(files, false)) {
            files = []
        }
        if (!is.array(embeds)) {
            _debug(`No embeds found, ignoring.`);
            continue;
        }
        const cName = `${que.webhook}${que.threadId ? `?thread_id=${que.threadId}` : ""}`
        if (channels[cName]) {
            channels[cName].embeds.push(...embeds);
            channels[cName].components.push(...components);
            if (is.string(content) && content !== "undefined") {
                if (is.string(channels[cName].content)) {
                    channels[cName].content = `${channels[cName].content}\n${content}`.slice(0, 2000);
                } else {
                    channels[cName].content = content;
                }
            }
        } else {
            channels[cName] = { allowed_mentions: allowed_mentions || undefined, content: content || "", channelId, webhook, name: wb?.name || "", icon: wb?.icon || "", files, embeds, components, threadId };
        }
    }
    queue.length = 0;
    for (const channel of Object.keys(channels)) {
        let ch = channels[channel],
            [id, token] = ch.webhook.split("/");
        if (!ch.embeds.length) {
            _debug(`There is no embeds (${ch.embeds.length})`);
            delete channels[channel];
            continue;
        }
        delete channels[channel];

        let chunks = chunk(ch.embeds, 10);
        if (!chunks.length) {
            _debug(`No 'chunks' found, ignoring.`);
            continue;
        }
        for (const send of chunks) {
            let res = await new Promise(async (resolve) => {
                const toJSON = (e: any) => "toJSON" in e ? e.toJSON() : e;
                let length = send.map(embed => embedLength(toJSON(embed))).reduce((a, b) => a + b, 0);
                const sendQ = (embeds: AnyEmbed | AnyEmbed[]) => sendQueue(id, token, {
                    embeds: is.array(embeds) ? embeds.map(c => toJSON(c)) : [toJSON(embeds)],
                    avatarURL: ch.icon,
                    content: ch.content,
                    username: ch.name,
                    files: ch.files,
                    components: is.array(ch.components) ? ch.components.map(c => toJSON(c)).slice(0, 5) : ch.components,
                    threadId: ch.threadId,
                    channelId: ch.channelId,
                    allowed_mentions: ch.allowed_mentions,
                })
                if (length >= 6_000) {
                    for (const embed of send) {
                        sendQ(embed as any);
                    }
                    resolve(true);
                } else {
                    resolve(await sendQ(send as any));
                }
            });
            if (!res) {
                _debug(`'queue.run.res' is false, stopping the entire queue.`)
                return false
            }
            continue;
        }
    };
}


export async function sendQueue(id: string, token: string, { embeds, content, username, avatarURL, threadId, components, files, channelId, allowed_mentions, flags }: QueueSendOptions, shouldTransformComponents = true) {
    const data = {
        query: makeURLSearchParams({
            thread_id: threadId,
            wait: true,
            with_components: true,
        }),
        body: {
            username,
            flags,
            avatar_url: avatarURL,
            content: is.string(content) && content !== "undefined" ? content : "",
            components: shouldTransformComponents ? getComponents(components || []) : components || undefined,
            embeds,
            allowed_mentions,
        },
        auth: false,
        files,
    };
    return await rest.post(Routes.webhook(id, token), data)
        .then((m) => {
            handlers.afterWebhookSent(m as APIMessage)
            return m as APIMessage;
        })
        .catch(async (e: unknown) => {
            if (channelId) {
                _debug(`[WEBHOOK:CACHE:DELETED]: for channelId (${channelId})`);
                await caching.handler.remove(channelId, "webhooks");
            }
            // @ts-ignore
            handlers.errorWebhookSend(e, {
                ...data,
                channelId,
            });
            return null;
        });
}

export function startQueue(interval = get.secs(6)) {
    if (interval <= 0) {
        throwError(`You have to provide a interval longer than 0ms`);
    }
    if (queueInterval) {
        clearInterval(queueInterval);
    }
    queueInterval = setInterval(() => run(), interval);

}

export interface QueueSendOptions {
    flags?: number;
    channelId?: string;
    threadId?: string;
    embeds?: unknown[];
    files?: RawFile[];
    components?: unknown[];
    content?: string | null;
    username?: string;
    avatarURL?: string;
    allowed_mentions?: Partial<{
        parse: string[];
        users: string[];
        roles: string[];
    }>
}

export interface QueueSendBody {
    query: {
        thread_id?: string;
        wait: boolean;
        with_components: boolean;
    };
    body: QueueSendOptions;
    auth: boolean;
    files: RawFile[];
    channelId?: string;
}

export interface QueueOptions {
    channelId: string;
    webhook: string;
    threadId?: string;
    opts: Partial<{
        flags: number;
        files: RawFile[];
        embeds: AnyEmbed[];
        components: ActionRowBuilder<any>[];
        content: string | null;
        allowed_mentions: sendOptions['allowed_mentions'];
        webhook: Partial<{
            name: string;
            icon: string;
        }>
    }>
}