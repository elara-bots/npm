import EventEmitter from "events";
import moment from "moment";
import "moment-duration-format";
import { Twitch } from ".";
import { StreamEvents } from "./constants";
import { Announcements } from "./discord";
import type { AnnounceData, Data, LiveStream } from "./interfaces";

export class Stream extends Twitch {
    #stream = new EventEmitter();
    /** @note In ms. */
    #timer = 6 * 60000;
    #data: string[];
    #cache = new Map<string, LiveStream>();
    #announcements = new Map<string, AnnounceData>();
    #announce: Announcements;
    #toggles = {
        live: true,
        update: true,
        ended: true,
    };
    public constructor(
        clientId: string,
        clientSecret: string,
        timerMinutes?: number
    ) {
        super(clientId, clientSecret);
        if (timerMinutes) {
            this.#timer = timerMinutes * 60000;
        }
        this.#data = [];
        this.#announce = new Announcements(this);
    }

    public setToggle(type: "live" | "update" | "ended") {
        this.#toggles[type] = this.#toggles[type] ? false : true;
        return this;
    }
    public get toggles() {
        return this.#toggles;
    }

    public get announcements() {
        return {
            add: (user: string, webhooks: string[]): Stream => {
                const find = this.#announcements.get(user);
                if (find) {
                    const add = webhooks.filter(
                        (c) => !find.webhooks.includes(c)
                    );
                    if (add.length) {
                        find.webhooks.push(...add);
                    }
                } else {
                    this.#announcements.set(user, { webhooks });
                }
                return this;
            },
            remove: (user: string, webhooks?: string[]): Stream => {
                const find = this.#announcements.get(user);
                if (!find) {
                    return this;
                }
                if (webhooks?.length && find.webhooks.length) {
                    find.webhooks = find.webhooks.filter((c) =>
                        webhooks.includes(c)
                    );
                } else {
                    this.#announcements.delete(user);
                }
                return this;
            },

            list: (user?: string) => {
                if (!user) {
                    if (!this.#announcements.size) {
                        return [];
                    }
                    const list = [];
                    for (const [user, value] of this.#announcements.entries()) {
                        list.push({
                            user,
                            webhooks: value.webhooks,
                        });
                    }
                    return list;
                }
                const f = this.#announcements.get(user);
                if (!f) {
                    return [];
                }
                return [{ user, webhooks: f.webhooks }];
            },
        };
    }

    public setTimer(minutes: number) {
        this.#timer = minutes * 60000;
        return this;
    }

    public get caches() {
        return {
            get: (id: string) => this.#cache.get(id),
            user: (user: string) =>
                [...this.#cache.values()].find((c) =>
                    [c.user_id, c.user_login].includes(user)
                ),
            size: () => this.#cache.size,
            delete: (id: string) => this.#cache.delete(id),
            all: () => [...this.#cache.values()],
            update: (stream: LiveStream) => this.#cache.set(stream.id, stream),
            add: (stream: LiveStream) => {
                if (!this.#cache.has(stream.id)) {
                    this.#cache.set(stream.id, stream);
                }
            },
        };
    }

    public live(listener: (stream: LiveStream) => unknown) {
        this.#stream.on(StreamEvents.LIVE, listener);
        return this;
    }

    public update(
        listener: (oldStream: LiveStream, newStream: LiveStream) => unknown
    ) {
        this.#stream.on(StreamEvents.UPDATE, listener);
        return this;
    }

    public ended(listener: (stream: LiveStream) => unknown) {
        this.#stream.on(StreamEvents.ENDED, listener);
        return this;
    }

    public get users() {
        return {
            list: () => [...this.#data.values()],
            add: (users: Data): Stream => {
                if (typeof users === "string") {
                    users = [users];
                }
                for (const user of users) {
                    if (!this.#data.includes(user)) {
                        this.#data.push(user);
                    }
                }
                return this;
            },

            remove: (users: Data): Stream => {
                if (typeof users === "string") {
                    users = [users];
                }
                for (const user of users) {
                    if (this.#data.includes(user)) {
                        this.#data = this.#data.filter((c) => c !== user);
                    }
                }
                return this;
            },
        };
    }

    public async run(): Promise<unknown> {
        if (!this.#data.length) {
            return this.#timeout();
        }

        const data = await this.stream(this.#data);
        let live = 0;
        let nolive = 0;
        if (data.status && data.data?.length) {
            const found: string[] = [];
            for (const stream of data.data as LiveStream[]) {
                if (stream.thumbnail_url) {
                    stream.thumbnail_url = `${stream.thumbnail_url
                        .replace(/{width}/gi, "1920")
                        .replace(/{height}/gi, "1080")}?int=${Math.floor(
                        Math.random() * 999999999999999
                    )}`;
                }
                found.push(stream.user_id, stream.user_login);
                if (!stream.started_at) {
                    nolive++;
                    continue;
                }
                stream.duration = this.getDuration(stream);
                if (
                    Date.now() - new Date(stream.started_at).getTime() <=
                    this.#timer + 1200
                ) {
                    const announcements =
                        this.#announcements.get(stream.user_id) ||
                        this.#announcements.get(stream.user_login);
                    if (
                        announcements &&
                        announcements.webhooks?.length &&
                        this.#toggles.live
                    ) {
                        this.#announce.live(stream, announcements.webhooks);
                    }
                    this.#stream.emit(StreamEvents.LIVE, stream);
                    this.caches.add(stream);
                    live++;
                } else {
                    const old = this.caches.get(stream.id);
                    if (!old) {
                        nolive++;
                        this.#log(
                            `[STREAM:RUNNING]: ${stream.user_login} (${stream.user_id}) is already streaming, adding to cache for update/stop announcements`
                        );
                        this.caches.add(stream);
                        continue;
                    }
                    if (
                        old.game_id !== stream.game_id ||
                        old.game_name !== stream.game_name ||
                        old.tags.length !== stream.tags.length ||
                        old.title !== stream.title ||
                        old.type !== stream.type ||
                        old.is_mature !== stream.is_mature ||
                        old.duration !== stream.duration ||
                        old.viewer_count !== stream.viewer_count
                    ) {
                        live++;
                        const announcements =
                            this.#announcements.get(stream.user_id) ||
                            this.#announcements.get(stream.user_login);
                        if (
                            announcements &&
                            announcements.webhooks?.length &&
                            this.#toggles.update
                        ) {
                            this.#announce.update(stream);
                        }
                        this.#stream.emit(StreamEvents.UPDATE, old, stream);
                        this.caches.update(stream);
                    }
                }
            }
            const notLive = this.#data.filter((c) => !found.includes(c));
            nolive += notLive.length;
            for (const n of notLive) {
                const f = this.caches.user(n);
                if (f) {
                    this.#stream.emit(StreamEvents.ENDED, f);
                    this.caches.delete(f.id);
                    const announcements =
                        this.#announcements.get(f.user_id) ||
                        this.#announcements.get(f.user_login);
                    if (
                        announcements &&
                        announcements.webhooks?.length &&
                        this.toggles.ended
                    ) {
                        this.#announce.ended(f);
                    }
                }
            }
        } else {
            if (data.status === false && data.code === 500) {
                this.#log(
                    `[STREAM:ISSUE]: Unable to fetch the streaming data: ${data.message}`
                );
                return this.#timeout();
            }
            if (this.caches.size()) {
                for (const stream of this.caches.all()) {
                    if (!stream) {
                        continue;
                    }
                    this.#stream.emit(StreamEvents.ENDED, stream);
                    this.caches.delete(stream.id);
                    const announcements =
                        this.#announcements.get(stream.user_id) ||
                        this.#announcements.get(stream.user_login);
                    if (
                        announcements &&
                        announcements.webhooks?.length &&
                        this.toggles.ended
                    ) {
                        this.#announce.ended(stream);
                    }
                }
            }
            nolive += this.#data.length;
        }
        this.#log(
            `[STREAM:CHECK]: ${live.toLocaleString()}/${nolive.toLocaleString()}`
        );
        return this.#timeout();
    }

    #timeout() {
        return setTimeout(() => this.run(), this.#timer);
    }

    public getDuration(
        stream: LiveStream,
        format = "w[w], d[d], h[h], m[m], s[s]"
    ) {
        return (
            moment
                .duration(
                    new Date().getTime() - new Date(stream.started_at).getTime()
                )
                // @ts-ignore
                .format(format)
        );
    }

    #log(...args: unknown[]) {
        // @ts-ignore
        this.log(...args);
        return this;
    }
}
