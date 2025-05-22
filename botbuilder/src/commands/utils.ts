import { colors, discord, is, noop, Nullable } from "@elara-services/utils";
import { ChannelType, Routes } from "discord-api-types/v10";
import type { Client, GuildBasedChannel, Interaction } from "discord.js";
import { CachedInt } from "./interfaces";

export const interact = (
    i: CachedInt | Interaction,
    errors: (...args: unknown[]) => unknown = noop,
) => {
    return {
        /** EditReply */
        send: async (body: unknown, color: number = colors.red) => {
            if (is.string(body)) {
                body = compComment(body, color);
            }
            return await i.client.rest
                .patch(
                    Routes.webhookMessage(
                        i.client.user.id,
                        i.token,
                        "@original",
                    ),
                    {
                        body: {
                            ...(body as object),
                            flags: 1 << 15,
                        },
                        auth: false,
                    },
                )
                .catch(errors);
        },
        /** normal <Interaction>.reply */
        reply: async (body: unknown, color: number = colors.red) => {
            if (is.string(body)) {
                body = compComment(body, color);
            }
            let flags = 1 << 15;
            if (is.object(body, true)) {
                if ("flags" in body && is.number(body.flags, false)) {
                    flags = flags | body.flags;
                }
            }
            return await i.client.rest
                .post(Routes.interactionCallback(i.id, i.token), {
                    body: {
                        type: 7,
                        data: {
                            ...(body as object),
                            flags,
                        },
                    },
                    auth: false,
                })
                .catch(noop);
        },
    };
};

export function compComment(
    content: string,
    color = colors.red,
    before: unknown[] = [],
    after: unknown[] = [],
) {
    return {
        allowed_mentions: { parse: [] },
        components: [
            createContainer({
                color,
                components: [...before, text(content), ...after],
            }),
        ],
    };
}

export function makeSpacer() {
    return { type: 14, divider: true, spacing: 1 };
}
export const text = (content: string) => ({ type: 10, content });

export function createContainer(options: {
    spoiler?: boolean;
    color?: Nullable<number>;
    components: unknown[];
}) {
    return {
        type: 17,
        spoiler: options.spoiler ?? false,
        accent_color: options.color ?? null,
        components: options.components,
    };
}

export const media = (url: string, acc = false) =>
    acc
        ? {
              type: 11,
              media: { url },
          }
        : { media: { url } };

export const withAccessory = (acc: unknown, components: unknown[] = []) => ({
    // @ts-ignore
    type: 9,
    accessory: acc,
    components,
});

export async function pubMessage(
    client: Client,
    channelId: string,
    id?: string,
) {
    if (!id) {
        return;
    }
    const ch = await discord.channel<GuildBasedChannel>(client, channelId);
    if (!ch || ch.type !== ChannelType.GuildAnnouncement) {
        return;
    }
    return await client.rest
        .post(Routes.channelMessageCrosspost(channelId, id))
        .catch(noop);
}
