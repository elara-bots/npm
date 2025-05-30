import { EmbedBuilder } from "@discordjs/builders";
import { RawFile, REST } from "@discordjs/rest";
import { ButtonStyle, Interactions, Tasks } from "@elara-services/packages";
import {
    chunk,
    colors,
    disableComponent,
    discord,
    embedComment,
    formatNumber,
    get,
    getClientIntents,
    getComponent,
    getInteractionResponder,
    getInteractionResponders,
    getPackageStart,
    getPluralTxt,
    getRandom,
    getTimeLeft,
    hasBit,
    is,
    make,
    noop,
    removeAllBrackets,
    snowflakes,
    status,
    time,
    XOR,
} from "@elara-services/utils";
import { PaginatedMessage } from "@sapphire/discord.js-utilities";
import {
    APIGuildMember,
    APIMessage,
    RESTPatchAPIChannelMessageJSONBody,
    Routes,
} from "discord-api-types/v10";
import {
    Client,
    Collection,
    ComponentEmojiResolvable,
    ComponentType,
    Guild,
    GuildMember,
    type Interaction,
    Message,
    MessageCreateOptions,
    RESTPostAPIChannelMessageJSONBody,
    TextBasedChannel,
    TextInputStyle,
} from "discord.js";
import moment from "moment";
import { ObjectId } from "mongodb";
import pack from "../../package.json";
import {
    AddGiveaway,
    AddGiveawayWithTemplate,
    CollectionFilter,
    CollectionNames,
    CustomMessage,
    Giveaway,
    GiveawayDatabase,
    GiveawayFilter,
    GiveawaySettings,
    GiveawaySettingsUpdateData,
    MongoDBOptions,
} from "../interfaces";
import { giveawayParser } from "../parser";
import { messages } from "../utils";
import { GiveawayBuilder } from "./builder";
import { MongoDB } from "./db";
import { EVENTS, GiveawayEvents } from "./events";
import { GiveawayTemplates } from "./templates";
import { GiveawayUtils } from "./utils";

const start = getPackageStart(pack);
let defaultHandler = false;

export class GiveawayClient extends GiveawayEvents {
    #mongo: MongoDB;
    #deleteAfter = 2;
    #syncTimer = get.secs(4);
    #randomButtonColor = false;
    #cache = new Collection<string, CollectionFilter>();
    #sync = new Collection<string, string>();
    #dapi = new REST();
    private errorHandler: (error: unknown) => null = noop;
    public templates = new GiveawayTemplates(this);
    public utils = new GiveawayUtils(this);
    public dbs: MongoDB["dbs"];
    public constructor(
        public client: Client,
        mongodb: MongoDBOptions,
        token?: string
    ) {
        super();
        if (!client || !(client instanceof Client)) {
            throw new Error(
                `${start}: No 'client' provided when constructing the client, or it's not an instance of a discord.js Client.`
            );
        }
        const t = token ?? client.token;
        if (!is.string(t)) {
            throw new Error(`The token wasn't available`);
        }
        this.#mongo = new MongoDB(mongodb);
        this.dbs = this.#mongo.dbs;
        this.#dapi.setToken(t);
    }

    public get filters() {
        return {
            add: (channelId: string, filter: GiveawayFilter) => {
                this.#cache.delete(channelId);
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
            multiple: {
                add: (
                    channels: { channelId: string; filter: GiveawayFilter }[]
                ) => {
                    const results = make.array<{
                        status: boolean;
                        message: string;
                    }>();
                    for (const c of channels) {
                        if (
                            !is.string(c.channelId) ||
                            typeof c.filter !== "function"
                        ) {
                            results.push(
                                status.error(
                                    `channelId isn't a string or filter isn't a function`
                                )
                            );
                            continue;
                        }
                        results.push(this.filters.add(c.channelId, c.filter));
                    }
                    return status.data(results);
                },
                get: (ids: string[]) =>
                    ids
                        .map((c) => this.#cache.get(c) ?? null)
                        .filter((c) => c) as CollectionFilter[],
                remove: (ids: string[]) => {
                    const count = ids.filter((c) => this.#cache.has(c)).length;
                    for (const id of ids) {
                        this.#cache.delete(id);
                    }
                    return status.success(
                        `Removed (${formatNumber(count)}) giveaway filters.`
                    );
                },
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

    public async handler(filter?: GiveawayFilter) {
        if (defaultHandler) {
            return this;
        }
        defaultHandler = true;
        // @ts-ignore
        this.#mongo.handler(this, filter);
        setInterval(() => this.#handleSync(), this.#syncTimer);

        // Every 30 minutes, delete the old giveaway data.
        setInterval(() => this.api.deleteOld(), get.mins(30));
        await this.api.scheduleAll();
        return this;
    }

    async #handleSync() {
        if (!this.#sync.size) {
            return;
        }
        const syncing = this.#sync.clone();
        this.#sync.clear();
        const dbs = await this.dbs.getAll("active", {
            id: {
                $in: [...syncing.values()],
            },
        });
        if (!is.array(dbs)) {
            return;
        }
        for await (const c of syncing.values()) {
            const db = dbs.find((r) => r.id === c);
            if (!db) {
                continue;
            }
            await this.api.update(
                db.id,
                db,
                "active",
                true,
                false,
                false,
                undefined,
                true
            );
        }
    }

    public setSyncTimer(ms: number) {
        this.#syncTimer = ms;
        return this;
    }

    public setDeleteOldAfter(days: number) {
        this.#deleteAfter = days || 2;
        return this;
    }

    public setRandomButtonColor(bool: boolean) {
        this.#randomButtonColor = bool;
        return this;
    }

    public setErrorHandler(handler?: (error: unknown) => null) {
        this.errorHandler = handler || noop;
        return this;
    }

    public get settings() {
        return {
            get: async (guildId: string) => await this.dbs.getSettings(guildId),
            update: async (guildId: string, data: GiveawaySettingsUpdateData) =>
                await this.dbs.settings
                    .updateOne({ guildId }, { $set: data })
                    .catch(this.errorHandler),
            remove: async (guildId: string) =>
                await this.dbs.settings
                    .deleteOne({ guildId })
                    .catch(this.errorHandler),
            list: async () =>
                (await this.dbs.settings
                    .find()
                    .toArray()
                    .catch(() => [])) as GiveawaySettings[],
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
        // prettier-ignore
        return (await this.#dapi[options?.method ?? "get"](route, {
            body: options?.body,
            query: options?.query,
            reason: options?.reason,
            auth: options?.auth,
            files: options?.files,
        })
            .catch(this.errorHandler)) as D | null;
    }

    get #messages() {
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
                disableButton = false,
                emoji?: ComponentEmojiResolvable
            ) => {
                const current = getComponent(m, `giveaway:${data.id}`);
                let style = ButtonStyle.GREEN;
                if (current) {
                    emoji = current.emoji;
                    style = current.style;
                } else if (this.#randomButtonColor) {
                    style = getRandom([
                        ButtonStyle.PRIMARY,
                        ButtonStyle.GREEN,
                        ButtonStyle.GREY,
                    ]);
                }
                const components = disableComponent(
                    m,
                    (id) => id.startsWith("giveaway"),
                    {
                        label: formatNumber(this.api.entries.count(data)),
                        style: disableButton ? ButtonStyle.DANGER : style,
                        disabled: disableButton ? true : false,
                        emoji,
                    }
                );
                if (
                    !components[0].components.some(
                        (c) =>
                            c.type === ComponentType.Button &&
                            "custom_id" in c &&
                            c.custom_id.startsWith("GA:user_list")
                    )
                ) {
                    components[0].components.push(
                        Interactions.button({
                            id: `GA:user_list:${data.id}`,
                            style: "GREY",
                            label: `Participants`,
                            emoji: { id: "1077714505766813756" },
                        })
                    );
                }
                return components;
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

            defaultMessageOptions: (
                id: string,
                data: AddGiveaway,
                options: MessageCreateOptions = {}
            ) => {
                if (is.array(data.mentions)) {
                    options.content = data.mentions
                        .map((c) => `<@${c.type === "role" ? "&" : ""}${c.id}>`)
                        .join(", ");
                }
                const extra = make.array([
                    `Winner${getPluralTxt(data.winners || 1)}: ${formatNumber(
                        data.winners || 1
                    )}`,
                ]);
                if (data.roles) {
                    if (is.array(data.roles.required)) {
                        extra.push(
                            `Required Role${getPluralTxt(
                                data.roles.required
                            )}: ${data.roles.required
                                .map((c) => `<@&${c}>`)
                                .join(", ")}`
                        );
                    }
                }

                if (data.host && data.host.id) {
                    extra.push(`Host: <@${data.host.id}>`);
                }
                const levels = this.utils.getLevelRequirements(data.prize);
                if (levels) {
                    extra.push(levels);
                }
                extra.push(`Ends at: ${time.relative(data.end)}`);
                options.embeds = [
                    {
                        color: data.embed?.color || colors.green,
                        author: { name: `🎊 GIVEAWAY! 🎊` },
                        title: this.utils.title(data),
                        description: extra.map((c) => `- ${c}`).join("\n"),
                        footer: { text: `ID: ${id}` },
                        thumbnail: this.utils.image(data, "thumbnail"),
                        image: this.utils.image(data, "image"),
                        fields: is.array(data.entries)
                            ? [
                                  {
                                      name: "\u200b",
                                      value: data.entries
                                          .sort((a, b) => b.amount - a.amount)
                                          .map(
                                              (c) =>
                                                  `- ${c.roles
                                                      .map((c) => `<@&${c}>`)
                                                      .join(
                                                          " "
                                                      )} (**${formatNumber(
                                                      c.amount
                                                  )}** entries)`
                                          )
                                          .join("\n"),
                                  },
                              ]
                            : undefined,
                    },
                ];
                return options;
            },

            isDefaultEmbed(msg: APIMessage) {
                if (msg.embeds.length > 1 || !is.array(msg.embeds)) {
                    return false;
                }
                const embed = msg.embeds[0];
                if (embed?.footer?.text?.startsWith?.("ID: ")) {
                    return true;
                }
                return false;
            },

            getDefaultWinnerMessage: async (
                data: GiveawayDatabase,
                guildId: string,
                winners: string[]
            ) => {
                const db = await this.settings.get(guildId);
                if (!db) {
                    return messages.def.winner(winners, data);
                }
                if (!is.object(db.messages.winner)) {
                    return messages.def.winner(winners, data);
                }
                return await giveawayParser<unknown, CustomMessage>(
                    db.messages.winner,
                    data,
                    undefined,
                    winners
                );
            },
            getDefaultRerollMessage: async (
                data: GiveawayDatabase,
                guildId: string,
                modId: string,
                winners: string[]
            ) => {
                const db = await this.settings.get(guildId);
                if (!db || !is.object(db.messages.winner)) {
                    return messages.def.reroll(winners, data, modId);
                }
                return await giveawayParser<unknown, CustomMessage>(
                    db.messages.reroll,
                    data,
                    undefined,
                    winners
                );
            },
        };
    }

    public get api() {
        return {
            get: async <D>(id: string, name: CollectionNames = "active") =>
                await this.dbs.getGiveaway<D>(id, name),

            update: async <D>(
                id: string,
                data: Giveaway<D>,
                name: CollectionNames = "active",
                updateMessage = true,
                disableButton = false,
                isEnd = false,
                r?: getInteractionResponders,
                skipSyncCheck = false
            ) => {
                const entries = this.utils.brackets.entries(data.prize);
                if (is.array(entries)) {
                    data.entries = this.utils.entries([
                        ...data.entries,
                        ...entries,
                    ]);
                }
                if (
                    name === "active" &&
                    [updateMessage, disableButton].includes(true) &&
                    !isEnd
                ) {
                    if (disableButton !== true && skipSyncCheck !== true) {
                        if (!this.#sync.has(data.id)) {
                            this.#sync.set(data.id, data.id);
                        }
                    } else {
                        const m = await this.#messages.fetch(data);
                        if (m) {
                            const embed = new EmbedBuilder(m.embeds[0]);
                            const isDefault = this.#messages.isDefaultEmbed(m);
                            if (isDefault) {
                                embed
                                    .setColor(
                                        disableButton
                                            ? colors.red
                                            : data.embed?.color || colors.green
                                    )
                                    .setAuthor({
                                        name: `🎊 GIVEAWAY${
                                            disableButton ? `ENDED` : ""
                                        } 🎊`,
                                    })
                                    .setTitle(this.utils.title(data));
                                if (is.array(data.entries)) {
                                    embed.setFields({
                                        name: "\u200b",
                                        value: data.entries
                                            .sort((a, b) => b.amount - a.amount)
                                            .map(
                                                (c) =>
                                                    `- ${c.roles
                                                        .map((c) => `<@&${c}>`)
                                                        .join(
                                                            " "
                                                        )} (**${formatNumber(
                                                        c.amount
                                                    )}** entries)`
                                            )
                                            .join("\n"),
                                    });
                                }
                                if (data.end) {
                                    const extra = make.array<string>([
                                        `Winner${getPluralTxt(
                                            data.winners || 1
                                        )}: ${formatNumber(data.winners || 1)}`,
                                    ]);

                                    if (data.roles) {
                                        if (is.array(data.roles.required)) {
                                            extra.push(
                                                `Required Role${getPluralTxt(
                                                    data.roles.required
                                                )}: ${data.roles.required
                                                    .map((c) => `<@&${c}>`)
                                                    .join(", ")}`
                                            );
                                        }
                                    }

                                    if (data.host && data.host.id) {
                                        extra.push(`Host: <@${data.host.id}>`);
                                    }
                                    const levels =
                                        this.utils.getLevelRequirements(data);
                                    if (levels) {
                                        extra.push(levels);
                                    }
                                    extra.push(
                                        `Ends at: ${time.relative(data.end)}`
                                    );
                                    if (is.array(extra)) {
                                        embed.setDescription(
                                            extra
                                                .map((c) => `- ${c}`)
                                                .join("\n")
                                        );
                                    }
                                    if (is.array(data.entries)) {
                                        embed.setFields({
                                            name: "\u200b",
                                            value: data.entries
                                                .sort(
                                                    (a, b) =>
                                                        b.amount - a.amount
                                                )
                                                .map(
                                                    (c) =>
                                                        `- ${c.roles
                                                            .map(
                                                                (c) =>
                                                                    `<@&${c}>`
                                                            )
                                                            .join(
                                                                " "
                                                            )} (**${formatNumber(
                                                            c.amount
                                                        )}** entries)`
                                                )
                                                .join("\n"),
                                        });
                                    }
                                }
                            }
                            if (r) {
                                await r.edit({
                                    content: disableButton ? null : undefined,
                                    embeds: isDefault
                                        ? [embed.toJSON()]
                                        : undefined,
                                    components: this.#messages.components(
                                        data,
                                        m,
                                        disableButton
                                    ),
                                });
                            } else {
                                await this.#messages.edit(data, {
                                    content: disableButton ? null : undefined,
                                    embeds: isDefault
                                        ? [embed.toJSON()]
                                        : undefined,
                                    components: this.#messages.components(
                                        data,
                                        m,
                                        disableButton
                                    ),
                                });
                            }
                        }
                    }
                }
                if (isEnd === true) {
                    await this.dbs.deleteGiveaway(id, "active");
                    const f = await this.dbs.getGiveaway(id, "old");
                    if (!f) {
                        await this.dbs.old
                            .insertOne({
                                ...data,
                                deleteAfter: moment()
                                    .add(this.#deleteAfter || 2, "days")
                                    .toISOString(),
                            } as Omit<Giveaway, "_id">)
                            .catch(this.errorHandler);
                    }
                }
                if (data.end) {
                    await this.api.schedule(id, data.end);
                }
                return await this.dbs[name]
                    .updateOne({ id }, { $set: data })
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
                const data = (await this.api.get(id, "active")) as Omit<
                    GiveawayDatabase,
                    "_id"
                >;
                this.#sync.delete(data?.id || id);
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
                    this.emit(
                        EVENTS.giveawayDelete,
                        data as GiveawayDatabase,
                        `Deleted 'old' version of the giveaway.`
                    );
                    await this.dbs.deleteGiveaway(id, "old");
                }
                this.emit(
                    EVENTS.giveawayDelete,
                    data as GiveawayDatabase,
                    `Deleted '${name}' version of the giveaway.`
                );
                return status.data(
                    (await this.dbs.deleteGiveaway(id, name)).filter(
                        (c) => c !== null
                    )
                );
            },

            end: async (id: string) => {
                const data = await this.api.get(id, "active");
                this.#sync.delete(data?.id || id);
                if (!data) {
                    return status.error(`Giveaway (${id}) not found.`);
                }
                if (!data.pending) {
                    return status.error(`Giveaway (${id}) isn't active.`);
                }
                await this.#end(id);
                return status.success(`Giveaway (${id}) has been force ended.`);
            },

            cancel: async (id: string, reason = "No Reason Provided.") => {
                const data = await this.api.get(id, "active");
                this.#sync.delete(data?.id || id);
                if (!data) {
                    return status.error(`Giveaway (${id}) not found.`);
                }
                const msg = await this.#messages.fetch(data);
                if (msg) {
                    await this.#messages.edit(
                        data,
                        {
                            embeds: [
                                new EmbedBuilder(msg.embeds[0])
                                    .setTitle(`Giveaway Cancelled!`)
                                    .setColor(colors.red)
                                    .toJSON(),
                            ],
                            components: this.#messages.components(
                                data,
                                msg,
                                true
                            ),
                            attachments: [],
                        },
                        []
                    );
                }
                this.emit(EVENTS.giveawayCancel, data, reason);
                return await this.api.del(id, "active", true);
            },

            create: async (data: XOR<AddGiveaway, AddGiveawayWithTemplate>) => {
                if (!is.string(data.channelId) || !is.string(data.guildId)) {
                    return status.error(
                        `You failed to provide (data.channelId) or (data.guildId)`
                    );
                }
                if (is.string(data.template)) {
                    data = await this.templates.toGiveaway(
                        data.template,
                        data.guildId,
                        data
                    );
                }
                if (!data.end) {
                    return status.error(
                        `You failed to provide a 'end' date for the giveaway!`
                    );
                }
                if (!is.string(data.prize)) {
                    return status.error(
                        `You failed to provide a 'prize' when creating the giveaway.`
                    );
                }
                const channel = await discord.channel<TextBasedChannel>(
                    this.client,
                    data.channelId,
                    undefined,
                    { cache: false }
                );
                if (!channel || !("guild" in channel)) {
                    return status.error(
                        `Unable to find (${data.channelId}) channel.`
                    );
                }
                const gId = snowflakes.generate();
                data.roles = this.utils.roles(data);
                let options: MessageCreateOptions = {
                    components: [],
                };
                const button = Interactions.button({
                    id: `giveaway:${gId}`,
                    // @ts-ignore
                    style: data.button?.style || 1,
                    label: `0`,
                });

                button.emoji = { name: "🎉" };
                if (data.button) {
                    if (data.button.emoji) {
                        button.emoji = is.number(parseInt(data.button.emoji))
                            ? { id: data.button.emoji }
                            : { name: data.button.emoji };
                    }
                }
                options.components = [
                    {
                        type: 1,
                        components: [
                            button,
                            Interactions.button({
                                id: `GA:user_list:${gId}`,
                                style: "GREY",
                                label: `Participants`,
                                emoji: { id: "1077714505766813756" },
                            }),
                        ],
                    },
                    ...(data.options?.components?.slice(0, 4) || []),
                ];

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
                const p = new GiveawayBuilder(data).toJSON();
                const entries = this.utils.brackets.entries(p.prize);
                if (is.array(entries)) {
                    p.entries = this.utils.entries([...p.entries, ...entries]);
                }
                if (!is.array(options.embeds) && !is.string(options.content)) {
                    options = this.#messages.defaultMessageOptions(
                        gId,
                        p,
                        options
                    );
                }
                const dbb = {
                    id: gId,
                    winners: p.winners,
                    channelId: p.channelId,
                    end: p.end,
                    messageId: "",
                    guildId: channel.guildId,
                    host: p.host,
                    pending: true,
                    prize: p.prize,
                    start: new Date().toISOString(),
                    users: [],
                    roles: p.roles,
                    entries: p.entries,
                    won: [],
                    rerolled: [],
                    embed: p.embed,
                } as Omit<GiveawayDatabase, "_id">;

                const msg = (await channel
                    .send(
                        await giveawayParser(options, dbb as GiveawayDatabase, {
                            guild: channel.guild,
                        })
                    )
                    .catch((e) => new Error(e))) as Message | Error;
                if (msg instanceof Error) {
                    return status.error(
                        `Giveaway not created, error while trying to send to (${
                            data.channelId
                        }) channel. ${
                            msg?.stack || msg.message || "Unknown Error?"
                        }`
                    );
                }
                dbb.messageId = msg.id;
                const r = await this.dbs.active
                    .insertOne(dbb)
                    .catch(this.errorHandler);
                if (!r) {
                    return status.error(
                        `Giveaway not created, error while trying to save to the database.`
                    );
                }
                const gData = await this.api.get(gId);
                if (gData) {
                    this.emit(EVENTS.giveawayStart, gData);
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
                const dbs = await this.dbs.getAll("active");
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
                count: <D>(data: Giveaway<D>, userCount = true) =>
                    userCount
                        ? data.users.length
                        : data.users
                              .map((c) => c.entries)
                              .reduce((a, b) => a + b, 0),
                user: async <D>(
                    data: Giveaway<D>,
                    userId: string
                ): Promise<number> => {
                    let member: APIGuildMember | null = null;
                    const guild = await this.#getGuild(data.guildId);
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
                        member = (await this.#dapi
                            .get(`/guilds/${data.guildId}/members/${userId}`)
                            .catch(this.errorHandler)) as APIGuildMember | null;
                    }
                    if (!member) {
                        return 1;
                    }
                    let entries = 1;
                    const ents = this.utils.brackets.entries(data.prize);
                    const list = this.utils.entries([...ents, ...data.entries]);
                    if (is.array(list)) {
                        for (const e of list) {
                            if (member.roles.some((c) => e.roles.includes(c))) {
                                entries = Math.floor(entries + e.amount);
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
                                        entries = Math.floor(
                                            entries + e.amount
                                        );
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
                            const user = randomUsers(wins)[0];
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
                return win;
            },

            deleteOld: async () => {
                const dbs = await this.dbs.getAll("old");
                if (!is.array(dbs)) {
                    return status.error(`No old giveaways to process.`);
                }
                const ids = make.array<ObjectId>();
                const backups = make.array<GiveawayDatabase>();
                for (const c of dbs) {
                    if (!c.deleteAfter) {
                        continue;
                    }
                    if (getTimeLeft(new Date(c.deleteAfter), "s")) {
                        ids.push(c._id);
                        // @ts-ignore
                        backups.push(c);
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
                if (is.array(backups)) {
                    this.emit(
                        EVENTS.giveawayBulkDelete,
                        backups,
                        `[AUTOMATIC]: Purge of ${
                            this.#deleteAfter
                        } day${getPluralTxt(this.#deleteAfter)} old giveaways.`
                    );
                }
                return status.success(
                    `Removed (${r.deletedCount}) old giveaways.`
                );
            },

            reroll: async (
                id: string,
                modId: string,
                amount = 1,
                giveRewards = true
            ) => {
                const g =
                    (await this.api.get(id)) || (await this.api.get(id, "old"));
                if (!g) {
                    return status.error(`Unable to find (${id}) giveaway.`);
                }
                if (g.pending) {
                    return status.error(`Giveaway (${id}) is still on-going!`);
                }
                if (amount > (g.winners || 1)) {
                    return status.error(
                        `Reroll amount received is higher than the giveaway winners set. (${
                            g.winners || 1
                        })`
                    );
                }
                const msg = await this.#messages.fetch(g);
                if (!msg) {
                    return status.error(
                        `Unable to fetch the giveaway message.`
                    );
                }
                const winners = this.api.pickWinner(
                    {
                        ...g,
                        users: g.users.filter(
                            (c) => !(g.won || []).includes(c.id)
                        ),
                    },
                    amount
                );
                if (!is.array(winners)) {
                    return status.error(`Unable to find any new winners.`);
                }
                g.rerolled = [
                    ...new Set([...(g.rerolled || []), ...winners]).values(),
                ];
                this.emit(EVENTS.giveawayReroll, g, winners, modId);
                await this.api.update(
                    id,
                    g,
                    "old",
                    false,
                    false,
                    false,
                    undefined
                );
                await this.#messages.create(g.channelId, {
                    ...(await this.#messages.getDefaultRerollMessage(
                        g,
                        g.guildId,
                        modId,
                        winners
                    )),
                    message_reference: {
                        message_id: msg.id,
                        fail_if_not_exists: false,
                    },
                });
                if (giveRewards) {
                    await this.#handleRewards(g, winners);
                }
                return status.success(
                    `Successfully rerolled (${id}) giveaway!`
                );
            },

            list: {
                server: async (guildId: string) =>
                    await this.dbs.getAll("active", { guildId }),
                channel: async (channelId: string) =>
                    await this.dbs.getAll("active", { channelId }),
            },
        };
    }

    public get interactions() {
        return {
            main: async (i: Interaction, filter?: GiveawayFilter) => {
                this.interactions.users.list(i);
                this.interactions.users.remove(i);
                if (!i.isButton() || !i.customId.startsWith("giveaway:")) {
                    return;
                }
                if (
                    !(i.member instanceof GuildMember) ||
                    !(i.guild instanceof Guild)
                ) {
                    return;
                }
                const r = getInteractionResponder(i, this.errorHandler);
                await r.deferUpdate();
                // await r.defer({ ephemeral: true });
                const id = i.customId.split(":")?.[1] || "";
                if (!id) {
                    return r.followUp({
                        ephemeral: true,
                        ...embedComment(
                            `Unable to find the giveaway ID in the custom_id`
                        ),
                    });
                }
                const db = await this.api.get(id);
                if (!db || !db.pending) {
                    return r.followUp({
                        ephemeral: true,
                        ...embedComment(
                            `Unable to find giveaway (${id}) or it's no longer active.`
                        ),
                    });
                }
                if (db.host?.id) {
                    const data = await this.settings.get(db.guildId);
                    if (data && data.toggles.hostCanJoin !== true) {
                        if (db.host.id === i.user.id) {
                            return r.followUp({
                                ephemeral: true,
                                ...embedComment(
                                    `You can't join your own giveaway!`
                                ),
                            });
                        }
                    }
                }
                const filterOptions = {
                    user: i.user,
                    member: i.member,
                    channel: i.channel,
                    db,
                    guild: i.guild,
                };
                if (filter && typeof filter === "function") {
                    const p = await filter(filterOptions);
                    if (!p.status) {
                        return r.followUp({
                            ephemeral: true,
                            ...embedComment(p.message),
                        });
                    }
                }
                const found = this.filters.get(i.channelId);
                if (found) {
                    const p = await found.filter(filterOptions);
                    if (!p.status) {
                        return r.followUp({
                            ephemeral: true,
                            ...embedComment(p.message),
                        });
                    }
                }
                const d = await this.users(i.user.id)
                    .add(id, undefined, r)
                    .catch((e) => {
                        this.errorHandler(e);
                        return new Error(e);
                    });
                if (d instanceof Error) {
                    return r.followUp({
                        ephemeral: true,
                        ...embedComment(d.message),
                    });
                }
                return r.followUp({
                    ephemeral: true,
                    ...embedComment(d.message, d.status ? "Green" : "Red"),
                });
            },
            users: {
                list: async (i: Interaction) => {
                    if (
                        !i.inCachedGuild() ||
                        !("member" in i) ||
                        !i.channelId ||
                        !i.isRepliable()
                    ) {
                        return;
                    }
                    if (
                        !("customId" in i) ||
                        !i.customId.startsWith("GA:user_list")
                    ) {
                        return;
                    }
                    const [, value, gId] = i.customId.split(":");
                    const r = getInteractionResponder(i);
                    await r.defer({ ephemeral: true });
                    if (value === "user_list") {
                        const db =
                            (await this.api.get(gId)) ||
                            (await this.api.get(gId, "old"));
                        if (!db) {
                            return r.edit(
                                embedComment(`Giveaway (${gId}) not found.`)
                            );
                        }
                        if (!is.array(db.users)) {
                            return r.edit(
                                embedComment(
                                    `Giveaway (${gId}) has 0 users entered`
                                )
                            );
                        }
                        const pager = new PaginatedMessage()
                            .setShouldAddFooterToEmbeds(false)
                            .setActions(
                                PaginatedMessage.defaultActions.filter(
                                    (c) => c.type === ComponentType.Button
                                )
                            );
                        const users = make.array<{
                            id: string;
                            entries: number;
                            num: number;
                        }>();
                        let ii = 0;
                        for (const u of db.users.sort(
                            (a, b) => b.entries - a.entries
                        )) {
                            ii++;
                            users.push({ ...u, num: ii });
                        }
                        let page = 1;
                        const chunks = chunk(users, 10);
                        for (const c of chunks) {
                            pager.pages.push({
                                embeds: [
                                    new EmbedBuilder()
                                        .setAuthor({
                                            name: `🎊 Giveaway Participants 🎊 (Page ${formatNumber(
                                                page
                                            )} of ${formatNumber(
                                                chunks.length
                                            )})`,
                                        })
                                        .setColor(colors.purple)
                                        .setDescription(
                                            `These are the members that have participated in the giveaway of **${removeAllBrackets(
                                                db.prize
                                            )}**\n\n${c
                                                .map(
                                                    (c) =>
                                                        `${formatNumber(
                                                            c.num
                                                        )}. <@${
                                                            c.id
                                                        }> (**${formatNumber(
                                                            c.entries
                                                        )}** ${
                                                            c.entries === 1
                                                                ? "entry"
                                                                : "entries"
                                                        })`
                                                )
                                                .join("\n")}`
                                        )
                                        .setFooter({
                                            text: `Total Participants: ${formatNumber(
                                                db.users.length
                                            )}`,
                                        })
                                        .toJSON(),
                                ],
                                actions:
                                    db.pending === true &&
                                    (await this.utils.isAuthorized(
                                        i.guildId,
                                        i.channelId,
                                        i.member
                                    ))
                                        ? [
                                              {
                                                  customId: `GA:user_remove:${gId}`,
                                                  style: ButtonStyle.DANGER,
                                                  type: ComponentType.Button,
                                                  emoji: {
                                                      id: `1019045113151901726`,
                                                  },
                                                  label: `Remove Participant${getPluralTxt(
                                                      users
                                                  )}`,
                                                  run(context) {
                                                      context.collector.stop();
                                                  },
                                              },
                                          ]
                                        : [],
                            });
                            page++;
                        }
                        return pager.run(i, i.user).catch(noop);
                    }
                },
                remove: async (i: Interaction) => {
                    if (
                        !i.inCachedGuild() ||
                        !("member" in i) ||
                        !i.channelId ||
                        !i.isRepliable()
                    ) {
                        return;
                    }
                    if (
                        !("customId" in i) ||
                        !i.customId.startsWith("GA:user_remove")
                    ) {
                        return;
                    }
                    const [, value, gId] = i.customId.split(":");
                    const r = getInteractionResponder(i);
                    if (
                        !(await this.utils.isAuthorized(
                            i.guildId,
                            i.channelId,
                            i.member
                        ))
                    ) {
                        return r.reply({
                            ...embedComment(
                                `You're not an authorized giveaway manager.`
                            ),
                            ephemeral: true,
                        });
                    }
                    if (i.isButton()) {
                        if (value === "user_remove") {
                            return r.showModal({
                                custom_id: `GA:user_remove:${gId}`,
                                title: `Remove Giveaway User`,
                                components: [
                                    {
                                        type: 1,
                                        components: [
                                            {
                                                type: ComponentType.TextInput,
                                                style: TextInputStyle.Paragraph,
                                                custom_id: "id",
                                                label: "User IDs",
                                                max_length: 2000,
                                                min_length: 15,
                                                required: true,
                                                placeholder:
                                                    "Enter the user IDs to remove, separated by ','",
                                            },
                                        ],
                                    },
                                ],
                            });
                        }
                    }
                    if (i.isModalSubmit()) {
                        if (value === "user_remove") {
                            await r.defer({ ephemeral: true });
                            const g = await this.api.get(gId);
                            if (!g) {
                                return r.edit(
                                    embedComment(
                                        `Unable to find (${gId}) giveaway.`
                                    )
                                );
                            }
                            if (!g.pending) {
                                return r.edit(
                                    embedComment(
                                        `Giveaway (${gId}) isn't active, so you can't remove users from it.`
                                    )
                                );
                            }
                            const ids = i.fields
                                .getTextInputValue("id")
                                .split(/,/gi)
                                .map((c) => c.trim());
                            if (!is.array(ids)) {
                                return r.edit(
                                    embedComment(
                                        `You didn't provide any user IDs to remove from the giveaway`
                                    )
                                );
                            }
                            const removed = make.array<string>();
                            const notFound = make.array<string>();
                            for (const id of ids) {
                                if (g.users.some((c) => c.id === id)) {
                                    removed.push(id);
                                } else {
                                    notFound.push(id);
                                }
                            }
                            if (is.array(removed)) {
                                g.users = g.users.filter(
                                    (c) => !removed.includes(c.id)
                                );
                                await this.api.update(
                                    g.id,
                                    g,
                                    "active",
                                    true,
                                    false,
                                    false
                                );
                            }
                            return r.edit(
                                embedComment(
                                    `- Removed: ${
                                        is.array(removed)
                                            ? removed
                                                  .map((c) => `<@${c}>`)
                                                  .join(", ")
                                            : "N/A"
                                    }\n- Not Found: ${
                                        is.array(notFound)
                                            ? notFound
                                                  .map((c) => `<@${c}>`)
                                                  .join(", ")
                                            : "N/A"
                                    }`,
                                    "Green"
                                )
                            );
                        }
                    }
                },
            },
        };
    }

    /**
     * @description Returns true/false if the client has certain gateway intents
     */
    #bit(bit: number) {
        return hasBit(getClientIntents(this.client), bit);
    }

    async #end(id: string) {
        const db = await this.api.get(id);
        if (!db || !db.pending) {
            this.emit(
                EVENTS.giveawayDebug,
                `Giveaway (${id}) wasn't found or isn't pending.`
            );
            return;
        }
        this.#sync.delete(db?.id || id);
        const msg = await this.#messages.fetch(db);
        if (!msg) {
            this.emit(
                EVENTS.giveawayDebug,
                `I couldn't fetch the giveaway message for ${db.id}`
            );
            return;
        }

        const members = await this.#getGuildMembers(db.guildId);
        if (members.size) {
            db.users = db.users.filter((c) => members.has(c.id));
        } else {
            this.emit(
                EVENTS.giveawayDebug,
                `Unable to fetch any members for (${db.guildId}) to filter out the left giveaway users.`
            );
        }

        db.pending = false;
        const winners = this.api.pickWinner(db, db.winners);
        db.won = winners;
        this.emit(EVENTS.giveawayEnd, db, winners);
        await Promise.all([
            this.api.update(id, db, "active", true, true, true),
            this.#messages.edit(db, {
                content: null,
                embeds: [messages.def.end(db, winners).toJSON()],
                components: this.#messages.components(db, msg, true, {
                    name: "🎊",
                }),
            }),
            this.#messages.create(db.channelId, {
                ...(await this.#messages.getDefaultWinnerMessage(
                    db,
                    db.guildId,
                    winners
                )),
                message_reference: {
                    message_id: msg.id,
                    fail_if_not_exists: false,
                },
            }),
            this.#handleRewards(db, winners),
        ]);
    }

    async #handleRewards(db: GiveawayDatabase, winners: string[]) {
        if (is.array(db.roles.add) || is.array(db.roles.remove)) {
            for await (const w of winners) {
                const m = await this.#getMember(db.guildId, w);
                if (m) {
                    let changed = false;
                    let current = [...m.roles.cache.keys()];
                    if (is.array(db.roles.add)) {
                        for (const id of db.roles.add) {
                            if (!current.includes(id)) {
                                current.push(id);
                                changed = true;
                            }
                        }
                    }
                    if (is.array(db.roles.remove)) {
                        if (current.some((c) => db.roles.remove?.includes(c))) {
                            changed = true;
                            current = current.filter(
                                (c) => !db.roles.remove?.includes(c)
                            );
                        }
                    }
                    if (changed) {
                        await m
                            .edit({
                                roles: current,
                                reason: `Giveaway winner (${db.id})`,
                            })
                            .catch(this.errorHandler);
                    }
                }
            }
        }
    }

    async #getMember(guildId: string, userId: string) {
        const guild = await this.#getGuild(guildId);
        if (!guild || !guild.available) {
            return null;
        }
        return await discord.member(guild, userId, true, false);
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
            add: async (
                id: string,
                entries?: number,
                r?: getInteractionResponders
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
                if (
                    res.roles &&
                    (is.array(res.roles.blocked) ||
                        is.array(res.roles.required))
                ) {
                    const member = await this.#getMember(res.guildId, userId);
                    if (!member) {
                        return status.error(
                            `Unable to fetch your member information.`
                        );
                    }
                    if (is.array(res.roles.blocked)) {
                        if (member.roles.cache.hasAny(...res.roles.blocked)) {
                            const has = res.roles.blocked.filter((c) =>
                                member.roles.cache.has(c)
                            );
                            return status.error(
                                `You have a role that isn't allowed to enter this giveaway: ${has
                                    .map((c) => `<@&${c}>`)
                                    .join(", ")}`
                            );
                        }
                    }
                    if (is.array(res.roles.required)) {
                        if (!member.roles.cache.hasAny(...res.roles.required)) {
                            return status.error(
                                `You need one of these roles to enter this giveaway: ${res.roles.required
                                    .map((c) => `<@&${c}>`)
                                    .join(", ")}`
                            );
                        }
                    }
                }
                const ent = is.number(entries)
                    ? entries
                    : await this.api.entries.user(res, userId);
                const find = res.users.find((c) => c.id === userId);
                if (find) {
                    if (find.entries !== ent) {
                        const before = find.entries;
                        find.entries = ent;
                        this.emit(EVENTS.giveawayUserUpdate, res, find);
                        await this.api.update(
                            res.id,
                            res,
                            undefined,
                            undefined,
                            undefined,
                            undefined,
                            r
                        );
                        return status.success(
                            `I've updated your entries from ${formatNumber(
                                before
                            )} to ${formatNumber(ent)}!`
                        );
                    }
                    res.users = res.users.filter((c) => c.id !== userId);
                    await this.api.update(
                        res.id,
                        res,
                        undefined,
                        undefined,
                        undefined,
                        undefined,
                        r
                    );
                    this.emit(EVENTS.giveawayUserRemove, res, find);
                    return status.error(
                        `You've been removed from the giveaway!`
                    );
                }
                const user = { id: userId, entries: ent };
                res.users.push(user);
                this.emit(EVENTS.giveawayUserAdd, res, user);
                await this.api.update(
                    res.id,
                    res,
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                    r
                );
                return status.success(`You've entered the giveaway!`);
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
                this.emit(EVENTS.giveawayUserRemove, res, find);
                res.users = res.users.filter((c) => c.id !== userId);
                await this.api.update(res.id, res);
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
                this.emit(EVENTS.giveawayUserUpdate, res, find);
                await this.api.update(res.id, res);
                return status.success(
                    `Updated (${userId}) user entries on giveaway (${id})`
                );
            },

            list: async <D>(guildIds?: string[]) => {
                return await this.dbs.getAll<D>("active", {
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
                });
            },
        };
    }

    async #getGuildMembers(guildId: string) {
        if (this.#bit(2)) {
            const guild = await this.#getGuild(guildId);
            if (guild && guild.available) {
                const m = await guild.members
                    .fetch(this.#bit(256) ? { withPresences: true } : undefined)
                    .catch(noop);
                if (m && m.size) {
                    return m;
                }
            }
        }
        return new Collection<string, GuildMember>();
    }

    async #getGuild(id: string) {
        return (
            this.client.guilds.resolve(id) ||
            (await this.client.guilds.fetch(id).catch(noop)) ||
            null
        );
    }
}
