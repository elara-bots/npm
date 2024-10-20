import { EmbedBuilder } from "@discordjs/builders";
import { REST, RawFile } from "@discordjs/rest";
import { DMManager } from "@elara-services/dms";
import { ButtonStyle, Interactions, Tasks } from "@elara-services/packages";
import {
    colors,
    discord,
    embedComment,
    field,
    formatNumber,
    get,
    getClientIntents,
    getInteractionResponder,
    getPackageStart,
    getTimeLeft,
    hasBit,
    is,
    limits,
    log,
    make,
    noop,
    snowflakes,
    status,
    time,
} from "@elara-services/utils";
import {
    APIGuildMember,
    APIMessage,
    GatewayMessageDeleteBulkDispatchData,
    GatewayMessageDeleteDispatchData,
    RESTPatchAPIChannelMessageJSONBody,
    Routes,
} from "discord-api-types/v10";
import {
    Client,
    Collection,
    ComponentType,
    GatewayDispatchEvents,
    Guild,
    GuildMember,
    type Interaction,
    Message,
    MessageCreateOptions,
    RESTPostAPIChannelMessageJSONBody,
    TextBasedChannel,
} from "discord.js";
import moment from "moment";
import { MongoClient, ObjectId } from "mongodb";
import pack from "../package.json";
import {
    AddGiveaway,
    CollectionNames,
    Entries,
    Giveaway,
    GiveawayDatabase,
    GiveawayFilter,
    GiveawaySettings,
    MongoDBOptions,
} from "./interfaces";

const start = getPackageStart(pack);
let defaultHandler = false;

export class GiveawayClient {
    #isConnected = false;
    #mongo: MongoClient;
    #deleteAfter = 2;
    #cache = new Collection<
        string,
        {
            channelId: string;
            filter: GiveawayFilter;
        }
    >();
    private rest = new REST();
    private errorHandler: (error: unknown) => null = noop;
    private dms: DMManager;
    public constructor(private client: Client<true>, mongodb: MongoDBOptions) {
        if (!client || !(client instanceof Client)) {
            throw new Error(
                `${start}: No 'client' provided when constructing the client, or it's not an instance of discord.js' Client.`
            );
        }
        if (mongodb instanceof MongoClient) {
            this.#mongo = mongodb;
        } else if (is.string(mongodb.url)) {
            this.#mongo = new MongoClient(mongodb.url, mongodb.options);
        } else {
            throw new Error(
                `${start}: No 'mongodb.url' or 'MongoClient provided when constructing the client.`
            );
        }
        this.#connect();
        if ("rest" in client && "setToken" in client.rest) {
            this.rest = client.rest;
        } else {
            this.rest.setToken(client.token);
        }
        this.dms = new DMManager(client.token, this.#mongo);
    }

    public get filters() {
        return {
            add: (channelId: string, filter: GiveawayFilter) => {
                this.#cache.set(channelId, {
                    channelId,
                    filter,
                });
                return status.success(
                    `Added giveaway filter for (${channelId}) channel.`
                );
            },
            remove: (channelId: string) => {
                if (!this.#cache.has(channelId)) {
                    return status.error(
                        `No giveaway filter for ${channelId} channel`
                    );
                }
                this.#cache.delete(channelId);
                return status.success(
                    `Removed giveaway filter for (${channelId}) channel.`
                );
            },
            get: (channelId: string) => this.#cache.get(channelId) ?? null,
            removeAll: () => {
                if (!this.#cache.size) {
                    return status.error(`No giveaway filters found.`);
                }
                const size = this.#cache.size;
                this.#cache.clear();
                return status.success(`Removed (${size}) giveaway filters.`);
            },
            list: (ids?: string[]) => {
                if (is.array(ids)) {
                    return [
                        ...this.#cache
                            .filter((c) => ids.includes(c.channelId))
                            .values(),
                    ];
                }
                return [...this.#cache.values()];
            },
        };
    }

    private get removal() {
        return {
            handle: async (
                name: string,
                value: string[],
                col: CollectionNames = "active"
            ) => {
                return await this.dbs[col]
                    .deleteMany({
                        [name]: {
                            $in: value,
                        },
                    })
                    .catch(this.errorHandler);
            },
            messages: async (ids: string[]) => {
                return await Promise.all([
                    this.removal.handle("messageId", ids),
                    this.removal.handle("messageId", ids, "old"),
                ]);
            },
            channels: async (channels: string[]) => {
                return await Promise.all([
                    // Remove the giveaways for the channels from both active and old databases.
                    this.removal.handle("channelId", channels),
                    this.removal.handle("channelId", channels, "old"),
                ]);
            },
            servers: async (ids: string[]) => {
                return await Promise.all([
                    this.removal.handle("guildId", ids),
                    this.removal.handle("guildId", ids, "old"),
                ]);
            },
        };
    }

    public async handler(filter?: GiveawayFilter) {
        if (defaultHandler) {
            return this;
        }
        defaultHandler = true;
        this.client.on("interactionCreate", async (i) => {
            if (i.isButton()) {
                return this.onInteraction(i, filter);
            }
        });
        this.client.on("channelDelete", async (channel) => {
            if (!channel) {
                return;
            }
            this.removal.channels([channel.id]);
        });
        this.client.on("threadDelete", async (thread) => {
            if (!thread) {
                return;
            }
            this.removal.channels([thread.id]);
        });
        this.client.ws.on(
            GatewayDispatchEvents.MessageDelete,
            (data: GatewayMessageDeleteDispatchData) => {
                if (!data?.id) {
                    return;
                }
                this.removal.messages([data.id]);
            }
        );

        this.client.ws.on(
            GatewayDispatchEvents.MessageDeleteBulk,
            (data: GatewayMessageDeleteBulkDispatchData) => {
                if (!is.array(data?.ids)) {
                    return;
                }
                this.removal.messages(data.ids);
            }
        );

        // Every 30 minutes, delete the old giveaway data.
        setInterval(() => this.api.deleteOld(), get.mins(30));
        const r = await this.api.scheduleAll();
        if (!r.status) {
            log(`${start}: [SCHEDULE:ALL:ISSUE]: ${r.message}`);
        }
    }

    public setDeleteOldAfter(days: number) {
        this.#deleteAfter = days || 2;
        return this;
    }

    public setErrorHandler(handler?: (error: unknown) => null) {
        this.errorHandler = handler || noop;
        this.dms.setErrorHandler(this.errorHandler);
        return this;
    }

    private col(name: CollectionNames = "active") {
        return this.#mongo.db("Giveaways").collection(name);
    }

    private get dbs() {
        return {
            active: this.col("active"),
            old: this.col("old"),
            settings: this.col("settings"),
        };
    }

    public get settings() {
        return {
            get: async (guildId: string): Promise<GiveawaySettings | null> =>
                (await this.dbs.settings
                    .findOne({ guildId })
                    .catch(this.errorHandler)) as GiveawaySettings | null,
            update: async (guildId: string, entries: Entries[]) => {
                return await this.dbs.settings
                    .updateOne({ guildId }, { entries })
                    .catch(this.errorHandler);
            },
            remove: async (guildId: string) =>
                await this.dbs.settings
                    .deleteOne({ guildId })
                    .catch(this.errorHandler),
        };
    }

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-constraint
    async #rest<D, B = unknown>(
        route: `/${string}`,
        options?: {
            method?: "get" | "post" | "patch" | "delete";
            body?: B;
            query?: URLSearchParams;
            reason?: string;
            auth?: boolean;
            files?: RawFile[];
        }
    ): Promise<D | null> {
        return (await this.rest[options?.method ?? "get"](route, {
            body: options?.body,
            query: options?.query,
            reason: options?.reason,
            auth: options?.auth,
            files: options?.files,
        }).catch(this.errorHandler)) as D | null;
    }

    private get messages() {
        return {
            fetch: async <D>(data: Giveaway<D>) => {
                return await this.#rest<APIMessage>(
                    Routes.channelMessage(data.channelId, data.messageId)
                );
            },

            edit: async <D>(
                data: Giveaway<D>,
                body: RESTPatchAPIChannelMessageJSONBody,
                files?: RawFile[]
            ) => {
                return await this.#rest<
                    APIMessage,
                    RESTPatchAPIChannelMessageJSONBody
                >(Routes.channelMessage(data.channelId, data.messageId), {
                    method: "patch",
                    body,
                    files,
                });
            },

            components: <D>(
                data: Giveaway<D>,
                m: APIMessage,
                disableButton = false
            ) => {
                return (
                    m.components?.map((c) => {
                        c.components = c.components.map((r) => {
                            if (
                                r.type === ComponentType.Button &&
                                "custom_id" in r &&
                                r.custom_id.startsWith("giveaways:")
                            ) {
                                r.label = formatNumber(
                                    this.api.entries.count(data)
                                );
                                if (disableButton) {
                                    r.disabled = true;
                                    r.style = ButtonStyle.DANGER;
                                }
                            }
                            return r;
                        });
                        return c;
                    }) || []
                );
            },

            create: async (
                channelId: string,
                body?: RESTPostAPIChannelMessageJSONBody,
                files?: RawFile[]
            ) => {
                return await this.#rest<APIMessage>(
                    Routes.channelMessages(channelId),
                    {
                        method: "post",
                        body,
                        files,
                    }
                );
            },

            defaultMessageOptions: (id: string, data: AddGiveaway) => {
                const options: MessageCreateOptions = {};
                if (is.array(data.mentions)) {
                    options.content = data.mentions
                        .map((c) => `<@${c.type === "role" ? "&" : ""}${c.id}>`)
                        .join(", ");
                }
                const extra = make.array([
                    `Winner${(data.winners || 1) === 1 ? "" : "s"
                    }: ${formatNumber(data.winners || 1)}`,
                ]);

                if (data.host && data.host.id) {
                    extra.push(`Host: <@${data.host.id}>`);
                }
                extra.push(`Ends at: ${time.relative(data.end)}`);
                options.embeds = [
                    {
                        color: colors.cyan,
                        title: `Giveaway!`,
                        description: `${data.prize}`,
                        fields: [
                            field(
                                `\u200b`,
                                extra.map((c) => `- ${c}`).join("\n")
                            ),
                        ],
                        footer: { text: `ID: ${id}` },
                    },
                ];
                return options;
            },

            isDefaultEmbed(msg: APIMessage) {
                if (msg.embeds.length > 1) {
                    return false;
                }
                const embed = msg.embeds[0];
                if (embed.footer?.text?.startsWith?.("ID: ")) {
                    return true;
                }
                return false;
            },
        };
    }

    public get api() {
        return {
            get: async <D>(
                id: string,
                name: CollectionNames = "active"
            ): Promise<Giveaway<D> | null> => {
                const g = (await this.dbs[name]
                    .findOne({ messageId: id })
                    .catch(this.errorHandler)) as Giveaway<D> | null;
                return (
                    g ||
                    ((await this.dbs[name]
                        .findOne({ id })
                        .catch(this.errorHandler)) as Giveaway<D> | null)
                );
            },

            update: async <D>(
                id: string,
                data: Giveaway<D>,
                name: CollectionNames = "active",
                updateMessage = true,
                disableButton = false,
                isEnd = false
            ) => {
                if (
                    name === "active" &&
                    [updateMessage, disableButton].includes(true)
                ) {
                    const m = await this.messages.fetch(data);
                    if (m) {
                        const embed = new EmbedBuilder(m.embeds[0]);
                        const isDefault = this.messages.isDefaultEmbed(m);
                        if (isDefault) {
                            embed
                                .setColor(
                                    disableButton ? colors.red : colors.green
                                )
                                .setTitle(
                                    disableButton
                                        ? `Giveaway Ended!`
                                        : `Giveaway!`
                                );
                            if (data.end) {
                                const extra = make.array<string>([
                                    `Winner${(data.winners || 1) === 1 ? "" : "s"
                                    }: ${formatNumber(data.winners || 1)}`,
                                ]);

                                if (data.host && data.host.id) {
                                    extra.push(`Host: <@${data.host.id}>`);
                                }
                                extra.push(
                                    `Ends at: ${time.relative(data.end)}`
                                );
                                if (is.array(extra)) {
                                    embed.setFields(
                                        field(
                                            `\u200b`,
                                            extra
                                                .map((c) => `- ${c}`)
                                                .join("\n")
                                        )
                                    );
                                }
                            }
                        }

                        await this.messages.edit(data, {
                            embeds: isDefault ? [embed.toJSON()] : undefined,
                            components: this.messages.components(
                                data,
                                m,
                                disableButton
                            ),
                        });
                    }
                }
                if (isEnd === true) {
                    await this.dbs.old
                        .insertOne({
                            ...data,
                            deleteAfter: moment()
                                .add(this.#deleteAfter || 2, "days")
                                .toISOString(),
                        } as Omit<Giveaway, "_id">)
                        .catch(this.errorHandler);
                }
                if (data.end) {
                    await this.api.schedule(id, data.end);
                }
                return await this.dbs[name]
                    .updateOne({ id }, data)
                    .catch(this.errorHandler);
            },
            /**
             * @description Deletes a giveaway from the system.
             */
            del: async (
                id: string,
                name: CollectionNames = "active",
                deleteOld = false
            ) => {
                const del = async (n: CollectionNames) => {
                    await this.dbs[n].deleteOne({ messageId: id }).catch(noop);
                    await this.dbs[n].deleteOne({ id }).catch(noop);
                };
                const data = (await this.api.get(id, "active")) as Omit<
                    Giveaway,
                    "_id"
                >;
                if (data && !deleteOld) {
                    await this.dbs.old
                        .insertOne({
                            ...data,
                            deleteAfter: moment()
                                .add(this.#deleteAfter || 2, "days")
                                .toISOString(),
                        })
                        .catch(this.errorHandler);
                }
                if (deleteOld) {
                    await del("old");
                }
                return await del(name);
            },

            cancel: async (id: string) => {
                const data = await this.api.get(id, "active");
                if (!data) {
                    return status.error(`Giveaway (${id}) not found.`);
                }
                const msg = await this.messages.fetch(data);
                if (msg) {
                    await this.messages.edit(
                        data,
                        {
                            embeds: [
                                new EmbedBuilder(msg.embeds[0])
                                    .setTitle(`Giveaway Cancelled!`)
                                    .setColor(colors.red)
                                    .toJSON(),
                            ],
                            components: this.messages.components(
                                data,
                                msg,
                                true
                            ),
                            attachments: [],
                        },
                        []
                    );
                }
                return await this.api.del(id, "active", true);
            },

            create: async (data: AddGiveaway) => {
                if (!is.string(data.prize)) {
                    return status.error(
                        `You failed to provide a 'prize' when creating the giveaway.`
                    );
                }
                if (data.prize.length > limits.description - 500) {
                    return status.error(
                        `Prize is above the embed description limit (${limits.description - 500
                        })`
                    );
                }
                const channel = await discord.channel<TextBasedChannel>(
                    this.client,
                    data.channelId,
                    undefined,
                    { cache: false, allowUnknownGuild: true }
                );
                if (!channel) {
                    return status.error(
                        `Unable to find (${data.channelId}) channel.`
                    );
                }
                const gId = snowflakes.generate();
                let options: MessageCreateOptions = {};
                const button = Interactions.button({
                    id: `giveaway:${gId}`,
                    style: data.button?.style || 1,
                    label: `0`,
                });

                if (data.button) {
                    if (data.button.emoji) {
                        button.emoji = is.number(parseInt(data.button.emoji))
                            ? { id: data.button.emoji }
                            : { name: data.button.emoji };
                    }
                    if (!button.emoji && !button.label) {
                        button.emoji = { name: "🎉" };
                    }
                    options.components = [
                        { type: 1, components: [button] },
                        ...(data.options?.components?.slice(0, 4) || []),
                    ];
                } else {
                    button.emoji = { name: "🎉" };
                    options.components = [
                        { type: 1, components: [button] },
                        ...(data.options?.components?.slice(0, 4) || []),
                    ];
                }
                if (is.object(data.options)) {
                    if (is.string(data.options.content)) {
                        options.content = data.options.content;
                    }
                    if (is.array(data.options.embeds)) {
                        options.embeds = data.options.embeds;
                    }
                    if (is.array(data.options.files)) {
                        options.files = data.options.files;
                    }
                }
                if (!is.array(options.embeds) && !is.string(options.content)) {
                    options = this.messages.defaultMessageOptions(gId, data);
                }
                const msg = (await channel.send(options).catch((e) => e)) as
                    | Message
                    | Error;
                if (msg instanceof Error) {
                    return status.error(
                        `Giveaway not created, error while trying to send to (${data.channelId
                        }) channel. ${msg?.stack || msg.message || "Unknown Error?"
                        }`
                    );
                }
                const r = await this.dbs.active
                    .insertOne({
                        id: gId,
                        winners: is.number(data.winners) ? data.winners : 1,
                        channelId: data.channelId,
                        end: data.end,
                        messageId: msg.id,
                        guildId: msg.guildId,
                        host: data.host,
                        pending: true,
                        prize: data.prize,
                        start: new Date().toISOString(),
                        users: [],
                    })
                    .catch(this.errorHandler);
                if (!r) {
                    return status.error(
                        `Giveaway not created, error while trying to save to the database.`
                    );
                }
                await this.api.schedule(gId, data.end);
                return status.success(`Giveaway created! ID: ${gId}`);
            },

            schedule: (id: string, time: Date | string) => {
                Tasks.delete(`giveaway:${id}`);
                return Tasks.create(
                    {
                        id: `giveaway:${id}`,
                        time: time instanceof Date ? time.toISOString() : time,
                        shouldCancel: true,
                    },
                    () => this.#end(id)
                );
            },

            reschedule: async (id: string) => {
                Tasks.delete(`giveaway:${id}`);
                const db = await this.api.get(id);
                if (!db) {
                    return status.error(`Unable to find (${id}) giveaway.`);
                }
                if (getTimeLeft(new Date(db.end), "s")) {
                    await this.#end(db.id);
                    return status.success(
                        `Giveaway (${id}) is finished, ending it now.`
                    );
                }
                await this.api.schedule(id, new Date(db.end));
                return status.success(`Rescheduled (${id}) giveaway.`);
            },

            scheduleAll: async () => {
                const dbs = (await this.dbs.active
                    .find()
                    .toArray()
                    .catch(() => [])) as GiveawayDatabase[];
                if (!is.array(dbs)) {
                    return status.error(
                        `Unable to find any giveaways to schedule.`
                    );
                }

                for (const d of dbs) {
                    if (getTimeLeft(d.end, "s")) {
                        this.#end(d.id);
                    } else {
                        this.api.schedule(d.id, d.end);
                    }
                }
                return status.success(`All giveaways has been rescheduled!`);
            },

            entries: {
                count: <D>(data: Giveaway<D>) =>
                    data.users.map((c) => c.entries).reduce((a, b) => a + b, 0),
                user: async <D>(
                    data: Giveaway<D>,
                    userId: string
                ): Promise<number> => {
                    let member: APIGuildMember | null = null;
                    const guild = await this.client.guilds
                        .fetch(data.guildId)
                        .catch(noop);
                    if (guild) {
                        const m = await discord.member(
                            guild,
                            userId,
                            true,
                            false
                        );
                        if (m) {
                            member = m.toJSON() as APIGuildMember;
                        }
                    } else {
                        member = (await this.rest
                            .get(`/guilds/${data.guildId}/members/${userId}`)
                            .catch(this.errorHandler)) as APIGuildMember | null;
                    }
                    if (!member) {
                        return 1;
                    }
                    let entries = 1;
                    if (is.array(data.entries)) {
                        for (const e of data.entries) {
                            if (member.roles.some((c) => e.roles.includes(c))) {
                                entries += e.amount;
                            }
                        }
                    } else {
                        const db = await this.settings.get(data.guildId);
                        if (db) {
                            if (is.array(db.entries)) {
                                for (const e of db.entries) {
                                    if (
                                        member.roles.some((c) =>
                                            e.roles.includes(c)
                                        )
                                    ) {
                                        entries += e.amount;
                                    }
                                }
                            }
                        }
                    }
                    return entries;
                },
            },

            pickWinner: <D>(data: Giveaway<D>, winners?: number) => {
                const wins = winners || data.winners;
                let list = make.array<string>();
                for (const user of data.users) {
                    for (let i = 0; i < user.entries; i++) {
                        list.push(user.id);
                    }
                }
                const randomUsers = (amount: number) => {
                    /**
                     * Random mechanism like https://github.com/discordjs/collection/blob/master/src/index.ts
                     * because collections/maps do not allow duplicates and so we cannot use their built in "random" function
                     */
                    return Array.from(
                        {
                            length: Math.min(amount, data.users.length),
                        },
                        () =>
                            list.splice(
                                Math.floor(Math.random() * list.length),
                                1
                            )[0]
                    );
                };
                const win = make.array<string>();

                for (const u of randomUsers(wins)) {
                    const isValidEntry = !win.some((winner) => winner === u);
                    if (isValidEntry) {
                        win.push(u);
                    } else {
                        // Find a new winner
                        for (let i = 0; i < list.length; i++) {
                            const user = randomUsers(1)[0];
                            const isUserValidEntry = !win.some(
                                (winner) => winner === user
                            );
                            if (isUserValidEntry) {
                                win.push(user);
                                break;
                            }
                            list = list?.filter((u) => u !== user);
                        }
                    }
                }
                return list;
            },

            deleteOld: async () => {
                const dbs = await this.dbs.old
                    .find()
                    .toArray()
                    .catch(() => []);
                if (!is.array(dbs)) {
                    return status.error(`No old giveaways to process.`);
                }
                const ids = make.array<ObjectId>();
                for (const c of dbs) {
                    if (!c.deleteAfter) {
                        continue;
                    }
                    if (getTimeLeft(new Date(c.deleteAfter), "s")) {
                        ids.push(c._id);
                    }
                }
                if (!is.array(ids)) {
                    return status.error(`No old giveaways to remove.`);
                }
                const r = await this.dbs.old
                    .deleteMany({
                        _id: {
                            $in: ids,
                        },
                    })
                    .catch(noop);
                if (!r || !r.deletedCount) {
                    return status.error(`No old giveaways to remove.`);
                }
                return status.success(
                    `Removed (${r.deletedCount}) old giveaways.`
                );
            },
        };
    }

    public async onInteraction(i: Interaction, filter?: GiveawayFilter) {
        if (!i.isButton() || !i.customId.startsWith("giveaway:")) {
            return;
        }
        if (!(i.member instanceof GuildMember) || !(i.guild instanceof Guild)) {
            return;
        }
        const r = getInteractionResponder(i, this.errorHandler);
        await r.defer({ ephemeral: true });
        const id = i.customId.split(":")?.[1] || "";
        if (!id) {
            return r.edit(
                embedComment(`Unable to find the giveaway ID in the custom_id`)
            );
        }
        const db = await this.api.get(id);
        if (!db || !db.pending) {
            return r.edit(
                embedComment(
                    `Unable to find giveaway (${id}) or it's no longer active.`
                )
            );
        }
        if (filter && typeof filter === "function") {
            const p = await filter({
                user: i.user,
                member: i.member,
                channel: i.channel,
                db,
                guild: i.guild,
            });
            if (!p.status) {
                return r.edit(embedComment(p.message));
            }
        }
        const found = this.filters.get(i.channelId);
        if (found) {
            const p = await found.filter({
                user: i.user,
                member: i.member,
                channel: i.channel,
                db,
                guild: i.guild,
            });
            if (!p.status) {
                return r.edit(embedComment(p.message));
            }
        }
        const d = await this.users(i.user.id)
            .add(id)
            .catch((e) => {
                this.errorHandler(e);
                return new Error(e);
            });
        if (d instanceof Error) {
            return r.edit(embedComment(d.message));
        }
        if (!d.status) {
            return r.edit(embedComment(d.message));
        }
        return r.edit(embedComment(d.message, "Green"));
    }

    #bit(bit: number) {
        return hasBit(getClientIntents(this.client), bit);
    }

    // TODO: Finish this.
    // TODO: Add a reschedule function that just adds the giveaway to the system
    async #end(id: string) {
        const db = await this.api.get(id);
        if (!db || !db.pending) {
            return;
        }
        const msg = await this.messages.fetch(db);
        if (!msg) {
            return;
        }
        if (this.#bit(2)) {
            const guild =
                this.client.guilds.resolve(db.guildId) ||
                (await this.client.guilds.fetch(db.guildId).catch(() => null));
            if (guild && guild.available) {
                const m = await guild.members
                    .fetch(this.#bit(256) ? { withPresences: true } : undefined)
                    .catch(() => null);
                if (m && m.size) {
                    db.users = db.users.filter((c) => m.has(c.id));
                }
            }
        }

        db.pending = false;
        await this.api.update(id, db, "active", true, true, true);
        const winners = this.api.pickWinner(db, db.winners);
        if (this.messages.isDefaultEmbed(msg)) {
            const embed = new EmbedBuilder(msg.embeds[0])
                .setColor(colors.green)
                .setTitle(`Giveaway Finished!`)
                .addFields(
                    field(
                        `Winner${winners.length === 1 ? "" : "s"}`,
                        winners.map((c) => `<@${c}>`).join(", ")
                    )
                );
            await this.messages.edit(db, { embeds: [embed.toJSON()] });
        }
        // TODO: Make the giveaway winner announcement message...
        await this.messages.create(db.channelId, {
            content: ``,
            message_reference: {
                message_id: msg.id,
                fail_if_not_exists: false,
            },
        });
    }

    public users(userId: string) {
        if (!is.string(userId)) {
            throw new Error(
                `No 'userId' provided in '<GiveawayClient>.users()'!`
            );
        }
        return {
            /**
             * @description 'id' is the message or giveaway ID
             */
            add: async (id: string, entries?: number) => {
                const res = await this.api.get(id);
                if (!res) {
                    return status.error(`Giveaway (${id}) not found.`);
                }
                if (!res.pending) {
                    return status.error(
                        `Giveaway (${id}) isn't pending, no users can be added to it.`
                    );
                }
                const ent = is.number(entries)
                    ? entries
                    : await this.api.entries.user(res, userId);
                const find = res.users.find((c) => c.id === userId);
                if (find) {
                    if (find.entries !== ent) {
                        find.entries = ent;
                        await this.api.update(res._id, res);
                        return status.success(
                            `Updated (${userId}) user's entries in giveaway (${id})`
                        );
                    }
                    return status.error(
                        `Giveaway user (${userId}) is already in the giveaway (${id})`
                    );
                }

                res.users.push({ id: userId, entries: ent });
                await this.api.update(res._id, res);
                return status.success(
                    `Added (${userId}) user to giveaway (${id})`
                );
            },
            /**
             * @description 'id' is the message or giveaway ID
             */
            remove: async (id: string) => {
                const res = await this.api.get(id);
                if (!res) {
                    return status.error(`Giveaway (${id}) not found.`);
                }
                if (!res.pending) {
                    return status.error(
                        `Giveaway (${id}) isn't pending, no users can be removed from it.`
                    );
                }
                const find = res.users.find((c) => c.id === userId);
                if (!find) {
                    return status.error(
                        `Giveaway user (${userId}) isn't in the giveaway (${id})`
                    );
                }
                res.users = res.users.filter((c) => c.id !== userId);
                await this.api.update(res._id, res);
                return status.success(
                    `Removed (${userId}) user from giveaway (${id})`
                );
            },

            update: async (
                id: string,
                type: "add" | "remove",
                entries: number
            ) => {
                const res = await this.api.get(id);
                if (!res) {
                    return status.error(`Giveaway (${id}) not found.`);
                }
                if (!res.pending) {
                    return status.error(
                        `Giveaway (${id}) isn't pending, no users can be added to it.`
                    );
                }
                const find = res.users.find((c) => c.id === userId);
                if (!find) {
                    return status.error(
                        `Giveaway user (${userId}) isn't in the giveaway (${id})`
                    );
                }
                if (type === "add") {
                    find.entries = Math.floor(find.entries + entries);
                } else {
                    find.entries = Math.floor(find.entries - entries);
                }
                if (find.entries <= 0) {
                    find.entries = 1;
                }
                await this.api.update(res._id, res);
                return status.success(
                    `Updated (${userId}) user entries on giveaway (${id})`
                );
            },

            list: async <D>(guildIds?: string[]) => {
                return (await this.dbs.active
                    .find({
                        pending: true,
                        users: {
                            $in: [userId],
                        },
                        ...(is.array(guildIds)
                            ? {
                                guildId: {
                                    $in: guildIds,
                                },
                            }
                            : {}),
                    })
                    .toArray()
                    .catch(() => [])) as Giveaway<D>;
            },
        };
    }

    async #connect() {
        if (this.#isConnected || !this.#mongo) {
            return;
        }
        await this.#mongo.connect();
        this.#isConnected = true;
    }
}
