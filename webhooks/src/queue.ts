import { embedLength } from "@discordjs/builders";
import { makeURLSearchParams, type RawFile } from "@discordjs/rest";
import { chunk } from "@elara-services/utils";
import { Routes, type APIMessage } from "discord-api-types/v10";
import { ActionRowBuilder, EmbedBuilder } from "discord.js";
import { _debug, getComponents, rest, throwError, webhooks } from ".";
export const queue: QueueOptions[] = [];
export const disabled: string[] = [];
export let queueInterval: NodeJS.Timer | null = null;

export let handlers = {
    afterWebhookSent: (message: APIMessage) => {
        _debug(`[WEBHOOK:MESSAGE:SENT]: `, message);
        return;
    },
    errorWebhookSend: (...args: unknown[]) => {
        _debug(`[WEBHOOK:MESSAGE:ERROR]: `, ...args);
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
        embeds: EmbedBuilder[];
        components: ActionRowBuilder[];
        files: RawFile[];
        channelId: string;
        webhook: string;
        name?: string | undefined;
        icon?: string | undefined;
        threadId: string | undefined;
    }> = {};
    for (const que of queue.filter(c => !disabled.includes(c.channelId))) {
        let { channelId, webhook, threadId, opts: { embeds, components, webhook: wb, files } } = que;
        if (!webhook) {
            _debug(`No 'webhook' url found, ignoring.`);
            continue;
        }
        if (!Array.isArray(embeds)) {
            embeds = [];
        }
        if (!Array.isArray(components)) {
            components = [];
        }
        if (!Array.isArray(files)) {
            files = []
        }
        if (!embeds.length) {
            _debug(`No embeds found, ignoring.`);
            continue;
        }
        const cName = `${que.webhook}${que.threadId ? `?thread_id=${que.threadId}` : ""}`
        if (channels[cName]) {
            channels[cName].embeds.push(...embeds);
            channels[cName].components.push(...components);
        } else {
            channels[cName] = { channelId, webhook, name: wb?.name || "", icon: wb?.icon || "", files, embeds, components, threadId };
        }
    }
    queue.length = 0;
    for (const channel of Object.keys(channels)) {
        let ch = channels[channel],
            [id, token] = ch.webhook.split("/");
        if (!webhooks.has(ch.channelId) || !ch.embeds.length) { 
            _debug(`channelId was found in the ignored webhooks collection (${webhooks.has(ch.channelId)}) or there is no embeds (${ch.embeds.length})`);
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
                const sendQ = (embeds: EmbedBuilder | EmbedBuilder[]) => sendQueue(id, token, {
                    embeds: Array.isArray(embeds) ? embeds.map(c => toJSON(c)) : [ toJSON(embeds) ],
                    avatarURL: ch.icon,
                    username: ch.name,
                    files: ch.files,
                    components: Array.isArray(ch.components) ? ch.components.map(c => toJSON(c)) : ch.components,
                    threadId: ch.threadId,
                    channelId: ch.channelId
                })
                if (length >= 6000) {
                    for (const embed of send) {
                        sendQ(embed);
                    }
                    resolve(true);
                } else {
                    resolve(await sendQ(send));
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


export async function sendQueue(id: string, token: string, { embeds, username, avatarURL, threadId, components, files, channelId }: QueueSendOptions, shouldTransformComponents = true) {
    await rest.post(
        Routes.webhook(id, token),
        {
            query: makeURLSearchParams({
                thread_id: threadId,
                wait: true,
            }),
            body: {
                username, avatar_url: avatarURL,
                components: shouldTransformComponents ? getComponents(components || []) : components || undefined,
                embeds
            },
            auth: false,
            files,
        }
    )
    .then((m) => handlers.afterWebhookSent(m as APIMessage))
    .catch((e: unknown) => {
        if (channelId) {
            _debug(`[WEBHOOK:CACHE:DELETED]: for channelId (${channelId})`);
            webhooks.delete(channelId);
        }
        handlers.errorWebhookSend(e);
    });
}

export function startQueue(interval: number = 6000) {
    if (interval <= 0) {
        throwError(`You have to provide a interval longer than 0ms`);
    }
    if (queueInterval) {
        clearInterval(queueInterval);
    }
    queueInterval = setInterval(() => run(), interval);

}

export interface QueueSendOptions {
    embeds: unknown[] | undefined;
    files: RawFile[] | undefined;
    components: unknown[] | undefined;
    username?: string | undefined;
    avatarURL?: string | undefined;
    threadId: string | undefined;
    channelId: string | undefined;
}

export interface QueueOptions {
    channelId: string;
    webhook: string;
    threadId: string | undefined;
    opts: {
        files?: RawFile[] | undefined;
        embeds?: EmbedBuilder[] | undefined;
        components?: ActionRowBuilder[] | undefined;
        webhook?: {
            name?: string | undefined;
            icon?: string | undefined;
        }
    }
}