import { getPackageStart, is, noop } from "@elara-services/utils";
import {
    GatewayDispatchEvents,
    GatewayMessageDeleteBulkDispatchData,
    GatewayMessageDeleteDispatchData,
} from "discord-api-types/v10";
import { Document, Filter, MongoClient } from "mongodb";
import pack from "../../package.json";
import {
    CollectionNames,
    Giveaway,
    GiveawayFilter,
    GiveawaySettings,
    MongoDBOptions,
} from "../interfaces";
import { GiveawayClient } from "./client";

export class MongoDB {
    #isConnected = false;
    public db: MongoClient;
    public constructor(options: MongoDBOptions) {
        if (options instanceof MongoClient) {
            this.db = options;
        } else if (is.string(options.url)) {
            this.db = new MongoClient(options.url, options.options);
        } else {
            throw new Error(
                `${getPackageStart(
                    pack
                )}: No 'mongodb.url' or 'MongoClient provided when constructing the client.`
            );
        }
        if (!this.#isConnected) {
            this.#connect();
        }
    }

    public get dbs() {
        const main = this.db.db("Giveaways");
        return {
            active: main.collection("active"),
            old: main.collection("old"),
            settings: main.collection("settings"),
            templates: main.collection("templates"),
            getSettings: async (guildId: string) =>
                (await this.dbs.settings
                    .findOne({ guildId })
                    .catch(noop)) as GiveawaySettings | null,
            getGiveaway: async <D>(
                id: string,
                name: CollectionNames = "active"
            ) => {
                const g = (await this.dbs[name]
                    .findOne({ id })
                    .catch(noop)) as Giveaway<D> | null;
                return (
                    g ??
                    ((await this.dbs[name]
                        .findOne({ messageId: id })
                        .catch(noop)) as Giveaway<D> | null)
                );
            },
            deleteGiveaway: async (
                id: string,
                name: CollectionNames = "active"
            ) => {
                return await Promise.all([
                    this.dbs[name].deleteOne({ id }).catch(noop),
                    this.dbs[name].deleteOne({ messageId: id }).catch(noop),
                ]);
            },
            getAll: async <D>(
                name: CollectionNames = "active",
                filter?: Filter<Document>
            ) =>
                (await this.dbs[name]
                    .find(filter || {})
                    .toArray()
                    .catch(() => [])) as Giveaway<D>[],
        };
    }

    get #removal() {
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
                    .catch(noop);
            },
            messages: async (ids: string[]) => {
                return await Promise.all([
                    this.#removal.handle("messageId", ids),
                    this.#removal.handle("messageId", ids, "old"),
                ]);
            },
            channels: async (channels: string[]) => {
                return await Promise.all([
                    // Remove the giveaways for the channels from both active and old databases.
                    this.#removal.handle("channelId", channels),
                    this.#removal.handle("channelId", channels, "old"),
                ]);
            },
            servers: async (ids: string[]) => {
                return await Promise.all([
                    this.#removal.handle("guildId", ids),
                    this.#removal.handle("guildId", ids, "old"),
                ]);
            },
        };
    }

    private async handler(gw: GiveawayClient, filter?: GiveawayFilter) {
        const { client } = gw;
        client.on("interactionCreate", async (i) => {
            if (i.isButton() || i.isModalSubmit()) {
                return gw.interactions.main(i, filter);
            }
        });
        client.on("channelDelete", async (channel) => {
            if (!channel) {
                return;
            }
            this.#removal.channels([channel.id]);
        });
        client.on("threadDelete", async (thread) => {
            if (!thread) {
                return;
            }
            this.#removal.channels([thread.id]);
        });
        client.ws.on(
            GatewayDispatchEvents.MessageDelete,
            (data: GatewayMessageDeleteDispatchData) => {
                if (!data?.id) {
                    return;
                }
                this.#removal.messages([data.id]);
            }
        );

        client.ws.on(
            GatewayDispatchEvents.MessageDeleteBulk,
            (data: GatewayMessageDeleteBulkDispatchData) => {
                if (!is.array(data?.ids)) {
                    return;
                }
                this.#removal.messages(data.ids);
            }
        );
    }

    async #connect() {
        if (this.#isConnected || !this.db) {
            return;
        }
        await this.db.connect();
        this.#isConnected = true;
    }
}
