import { CronClient } from "@elara-services/cron";
import { AES } from "@elara-services/packages";
import {
    formatNumber,
    get,
    getPackageStart,
    is,
    log,
    make,
    ms,
    snowflakes,
    status,
    time,
} from "@elara-services/utils";
import { DiscordWebhook, sendOptions } from "@elara-services/webhooks";
import { default as AdmZip } from "adm-zip";
import {
    existsSync,
    mkdirSync,
    readdirSync,
    statSync,
    unlinkSync,
    writeFileSync,
} from "fs";
import { MongoClient } from "mongodb";
import { name, version } from "../package.json";
import { BackupConnections, BackupOptions } from "./interfaces";
const cronName = `${name}_job`;
export * from "./interfaces";

export class Backups {
    private client = new CronClient();
    public constructor(private options: BackupOptions) {}

    #debug(...args: unknown[]) {
        if (!this.options.debug) {
            return;
        }
        log(`${getPackageStart({ name, version })}: `, ...args);
    }

    public get cron() {
        return {
            start: () => {
                if (
                    !this.options.cron ||
                    !this.options.cron.enabled ||
                    this.client.has(cronName)
                ) {
                    return;
                }
                this.client.add({
                    name: cronName,
                    time: this.options.cron.time || `0 */2 * * *`,
                    onStartup: this.options.cron.onStartup || false,
                    run: () => this.start(),
                });
            },

            stop: () => this.client.remove(cronName),
        };
    }

    public async handleFileRemoval() {
        if (
            !this.options.folderPath ||
            !this.options.old ||
            !is.boolean(this.options.old?.enabled) ||
            !this.options.old.enabled
        ) {
            return false;
        }
        const time = this.options.old.time || get.days(14);
        const files = this.#getFiles();
        if (!is.array(files)) {
            return false;
        }
        const removed = [];
        for await (const file of files) {
            if (Date.now() - snowflakes.get(file).date.getTime() > time) {
                unlinkSync(`${this.options.folderPath}/${file}.zip`);
                removed.push(file);
            }
        }
        if (is.array(removed)) {
            this.#debug(
                `Removing (${formatNumber(
                    removed.length
                )}) zip files, it's been over ${ms.get(time, true)}.`,
                `Files: ${removed.join(", ")}`
            );
        }
        return true;
    }

    #getURL(connect: BackupConnections) {
        if (connect.url) {
            return connect.url;
        }
        if (connect.name) {
            return `mongodb${
                connect.username && connect.password ? "+srv" : ""
            }://${
                connect.username && connect.password
                    ? `${connect.username}:${connect.password}`
                    : ""
            }127.0.0.1:${connect.port || 27017}/${connect.name}`;
        }
        return null;
    }

    #getIgnore(connect: BackupConnections) {
        const collections = connect.ignore?.collections || [];
        const databases = connect.ignore?.databases || [];
        databases.push(`local`, `admin`, `config`);
        if (this.options.ignore) {
            if (is.array(this.options.ignore.collections)) {
                collections.push(...this.options.ignore.collections);
            }
            if (is.array(this.options.ignore.databases)) {
                databases.push(...this.options.ignore.databases);
            }
        }
        return { collections, databases };
    }

    async #findOrCreate() {
        if (!this.options.folderPath) {
            return;
        }
        if (existsSync(this.options.folderPath)) {
            return;
        }
        mkdirSync(this.options.folderPath, { recursive: true });
    }

    async #saveToFolder(zip: AdmZip, id: string) {
        if (!this.options.folderPath) {
            return;
        }
        writeFileSync(`${this.options.folderPath}/${id}.zip`, zip.toBuffer());
    }

    #getWebhookOptions(
        id: string,
        fileSize: string | undefined,
        defContent: string
    ): sendOptions {
        const { webhook } = this.options;
        if (!webhook || !webhook.options) {
            return { content: defContent, embeds: [] };
        }
        return webhook.options(id, fileSize);
    }

    #saveToWebhook(zip: AdmZip, id: string) {
        if (!this.options.webhook || !this.options.webhook.url) {
            return;
        }
        const discord = new DiscordWebhook(this.options.webhook.url, {
            username: this.options.webhook.username || "System",
            avatar_url:
                this.options.webhook.avatar ||
                make.emojiURL("884086557802397726"),
        });
        if (this.options.webhook.noFile !== true) {
            discord.file({
                name: `${id}.zip`,
                data: zip.toBuffer(),
            });
        }
        const stats = statSync(`${this.options.folderPath}/${id}.zip`);
        let fileSize: string | undefined;
        if (stats && stats.size) {
            fileSize = `${(stats.size / (1024 * 1000)).toFixed(2)}MB`;
        }
        const res = this.#getWebhookOptions(
            id,
            fileSize,
            `[${time.short.dateTime(new Date())}]: Backup taken${
                id ? `\n> - ID: \`${id}.zip\`` : ""
            }${fileSize ? `\n> - Size: \`${fileSize}\`` : ""}`
        );
        if (is.string(res.content)) {
            discord.content(res.content);
        }
        if (is.array(res.embeds)) {
            // @ts-ignore
            discord.embeds(res.embeds);
        }
        if (discord.isEmpty()) {
            return this.#debug(`[saveToWebhook:ERROR]: Nothing to send?`);
        }

        return discord.send().catch((err) => {
            this.#debug(
                `[saveToWebhook:ERROR]: Error while trying to send message.`,
                err,
                `${id}.zip`
            );
        });
    }

    #getFiles() {
        if (!this.options.folderPath) {
            return [];
        }
        return readdirSync(this.options.folderPath)
            .filter((c) => c.endsWith(".zip"))
            .map((c) => c.split(".")?.[0] || "")
            .filter((c) => c);
    }

    public get aes() {
        return {
            encrypt: (str: string | object) =>
                new AES(this.options.encrypt?.key as string).encrypt(
                    is.string(str) ? str : JSON.stringify(str)
                ) as string,
            decrypt: (str: string) =>
                new AES(this.options.encrypt?.key as string).decrypt(
                    str
                ) as string,
            get: (data: string) => {
                if (
                    !this.options.encrypt?.enabled ||
                    !is.string(this.options.encrypt?.key)
                ) {
                    return status.error(
                        `Encryption isn't enabled or there is no key set.`
                    );
                }
                if (!is.string(data)) {
                    return status.error(`You didn't provide any data.`);
                }
                return status.data(JSON.parse(this.aes.decrypt(data)));
            },
        };
    }

    public async start() {
        if (!this.options.folderPath && !this.options.webhook) {
            return this.#debug(`[start]: No folderPath or webhook provided.`);
        }
        if (this.options.folderPath) {
            await this.#findOrCreate();
        }
        const connections = this.options.connections.filter((c) =>
            [undefined, true].includes(c.enabled)
        );
        if (!connections.length) {
            return this.#debug(
                `[start]: No connections could be found (enabled)`
            );
        }
        await this.handleFileRemoval();
        const zip = new AdmZip();
        await Promise.all(
            connections.map((c) => this.createBackupFile(c, zip))
        );
        const id = snowflakes.generate().toString();
        await this.#saveToFolder(zip, id);
        await this.#saveToWebhook(zip, id);
    }

    private async createBackupFile(connect: BackupConnections, zip: AdmZip) {
        const url = this.#getURL(connect);
        if (!url) {
            return;
        }
        const c = new MongoClient(url);
        const db = c.db();
        if (!connect.saveAllDatabases) {
            await this.handleDatabase(c, connect, undefined, zip);
        } else {
            const dbs = await this.getDatabases(c, connect);
            if (dbs.length) {
                await Promise.all(
                    dbs.map((str) => this.handleDatabase(c, connect, str, zip))
                );
            }
        }
        c.close(true).catch(() => null);
        this.#debug(`[${db.databaseName}]: Finished!`);
    }

    private async handleDatabase(
        mongo: MongoClient,
        connect: BackupConnections,
        dbName: string | undefined,
        zip: AdmZip
    ) {
        const url = this.#getURL(connect);
        if (!url) {
            return;
        }
        const ignore = this.#getIgnore(connect);
        const db = mongo.db(dbName);
        this.#debug(`[${db.databaseName}]: Fetching the collections.`);
        const collections = await db.listCollections().toArray();
        this.#debug(
            `[${db.databaseName}]: Fetching ${
                collections.filter((c) => c.name !== "messages").length
            } collections`
        );
        const isLocal = ["localhost", "127.0.0.1"].some((c) =>
            url.toLowerCase().includes(c)
        );
        const name = isLocal
            ? "local"
            : url.split("@")?.[1]?.split?.("/")?.[0] ?? "external";
        for await (const d of collections) {
            if (ignore.collections.includes(d.name)) {
                continue;
            }
            const dbs = await db.collection(d.name).find().toArray();
            if (dbs?.length) {
                if (
                    this.options.encrypt?.enabled === true &&
                    is.string(this.options.encrypt?.key)
                ) {
                    zip.addFile(
                        `${name}/${db.databaseName}/${d.name}.txt`,
                        Buffer.from(
                            this.aes.encrypt(JSON.stringify(dbs, undefined, 2)),
                            "utf-8"
                        ),
                        `Backup taken ${new Date().toLocaleString()}`
                    );
                } else {
                    zip.addFile(
                        `${name}/${db.databaseName}/${d.name}.json`,
                        Buffer.from(JSON.stringify(dbs, undefined, 2), "utf-8"),
                        `Backup taken ${new Date().toLocaleString()}`
                    );
                }
            }
        }
        this.#debug(`[${db.databaseName}]: Done fetching the collections.`);
    }

    private async getDatabases(mongo: MongoClient, connect: BackupConnections) {
        const ignore = this.#getIgnore(connect);
        const admin = mongo.db().admin();
        const dbs = await admin.listDatabases();
        if (dbs.ok !== 1) {
            return [];
        }
        return dbs.databases
            .filter((c) => !ignore.databases.includes(c.name) && !c.empty)
            .map((c) => c.name);
    }
}
