import { fetch, type RequestMethod } from "@elara-services/fetch";
import {
    APIEmbed,
    ButtonStyle,
    type APIActionRowComponent,
    type APIMessage,
    type APIMessageActionRowComponent,
} from "discord-api-types/v10";
import type { AnnounceCache, Stream, Vod } from ".";
import { sleep } from "./constants";
import { LiveStream } from "./interfaces";

export class Announcements {
    #caches = new Map<string, AnnounceCache[]>();
    #stream: Stream;
    public constructor(stream: Stream) {
        this.#stream = stream;
    }

    public async live(stream: LiveStream, discordUrls: string[]) {
        const embed = await this.#getEmbed(stream);
        for await (const c of discordUrls) {
            await this.send(stream.id, c, {
                body: {
                    username: `Twitch`,
                    avatar_url: this.#icon,
                    embeds: [embed],
                    components: this.#getComponents(stream),
                },
            });
            await sleep(1500);
        }
    }

    public async update(stream: LiveStream) {
        const find = this.#caches.get(stream.id);
        if (!find?.length) {
            return;
        }
        const embed = await this.#getEmbed(stream);
        for await (const c of find) {
            await this.send(stream.id, c.url, {
                method: "PATCH",
                messageId: c.messageId,
                body: {
                    embeds: [embed],
                    components: this.#getComponents(stream),
                },
            });
            await sleep(1500);
        }
    }

    public async ended(stream: LiveStream) {
        const find = this.#caches.get(stream.id);
        if (!find?.length) {
            return;
        }
        await sleep(30000);
        const [vod, embed] = await Promise.all([
            this.#stream.vods({
                users: [stream.user_id],
                games: [stream.game_id],
                type: "archive",
            }),
            this.#getEmbed(stream, true),
        ]);

        for await (const c of find) {
            await this.send(stream.id, c.url, {
                method: "PATCH",
                messageId: c.messageId,
                body: {
                    embeds: [embed],
                    components: this.#getComponents(
                        stream,
                        vod.status ? vod.data[0] : null,
                        true
                    ),
                },
            });
            await sleep(1500);
        }
        this.#caches.delete(stream.id);
    }

    private async send<D extends object>(
        streamId: string,
        url: string,
        options: {
            method?: RequestMethod;
            messageId?: string;
            body: D;
        }
    ) {
        const uri = new URL(url);
        uri.searchParams.append("wait", "true");
        if (options.messageId) {
            uri.pathname = `${uri.pathname}/messages/${options.messageId}`;
        }
        const request = fetch(uri.toString(), options?.method || "POST");
        if (options.body) {
            request.body(options.body, "json");
        }
        const r = await request.send().catch(() => {});
        if (r?.statusCode === 200) {
            let body = null;
            try {
                body = r.json<APIMessage>();
                // eslint-disable-next-line no-empty
            } catch {}
            if (body && (options?.method || "POST") === "POST") {
                const cache = this.#caches.get(streamId);
                if (cache) {
                    const f = cache.find((c) => c.url);
                    if (!f) {
                        cache.push({ url, messageId: body.id });
                    }
                } else {
                    this.#caches.set(streamId, [{ url, messageId: body.id }]);
                }
            }
            return body;
        }
        return null;
    }

    get #icon() {
        return `https://cdn.discordapp.com/emojis/793154382157840416.png`;
    }

    #getComponents(
        stream: LiveStream,
        vod?: Vod | null,
        ended?: boolean
    ): APIActionRowComponent<APIMessageActionRowComponent>[] {
        if (vod) {
            return [
                {
                    type: 1,
                    components: [
                        {
                            type: 2,
                            url: vod.url,
                            label: `Watch Vod`,
                            style: ButtonStyle.Link,
                        },
                    ],
                },
            ];
        }
        return ended
            ? []
            : [
                  {
                      type: 1,
                      components: [
                          {
                              type: 2,
                              url: `https://twitch.tv/${stream.user_login}`,
                              label: "Watch",
                              style: ButtonStyle.Link,
                              emoji: { id: "763196860822454292" },
                          },
                      ],
                  },
              ];
    }

    async #getEmbed(stream: LiveStream, ended?: boolean): Promise<APIEmbed> {
        const user = await this.#stream.user(stream.user_id);
        return {
            color: ended ? 0xff0000 : 0x9147ff,
            title: stream.title,
            url: `https://www.twitch.tv/${stream.user_login}`,
            author: {
                name: ended
                    ? `${stream.user_name} was live on Twitch`
                    : `${stream.user_name} is live on Twitch!`,
                icon_url: user.status
                    ? user.data[0].profile_image_url
                    : undefined,
                url: `https://www.twitch.tv/${stream.user_login}`,
            },
            fields: [
                {
                    name: "Game",
                    value: stream.game_name || "N/A",
                    inline: true,
                },
                {
                    name: "Viewers",
                    value: (stream.viewer_count || 0).toLocaleString(),
                    inline: true,
                },
            ],
            image: stream.thumbnail_url
                ? { url: stream.thumbnail_url }
                : undefined,
            footer: {
                text: `Online for ${this.#stream.getDuration(
                    stream,
                    "d [Days], h [Hours], m [Minutes]"
                )} | ${ended ? `Offline at` : `Last Updated at`}`,
                icon_url: `https://cdn.discordapp.com/emojis/854462980830134293.png`,
            },
            timestamp: new Date().toISOString(),
        };
    }
}
