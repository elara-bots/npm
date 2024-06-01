import { sendOptions } from "@elara-services/webhooks";
import { XOR } from "ts-xor";
export interface BackupOptions {
    debug?: boolean;

    /**
     * @description Encrypts the data being stored in the .zip file.
     * @warn This will increase the file size by a lot depending on the database sizes, so posting to a webhook might not work!
     */
    encrypt?: {
        enabled: boolean;
        key: string;
    };

    connections: BackupConnections[];
    cron?: {
        /** If the cron job should be running */
        enabled: boolean;
        /** The cron schedule expression to use. (default: every 2 hours) */
        time?: string;
        /** Runs the backup.start() function on cron start (default: false) */
        onStartup?: boolean;
    };
    old?: {
        /** Do you want the package to automatically remove old .zip files */
        enabled: boolean;
        /** If the backup ID is older than the time provided it will automatically be removed from the file system. (default: 2 weeks) */
        time?: number;
    };
    webhook?: {
        /** This will post the message to the webhook without the .zip file, but will post the ID/name of the zip file for easy lookup for a certain date. */
        noFile?: boolean;
        /**
         * @description The webhook URL to send the backup .zip file
         * @warn Discord does have a file size limit (25MB for non-boosted servers, so be careful!)
         */
        url: string;
        /** The webhook's username */
        username?: string;
        /** The webhook's avatar */
        avatar?: string;

        options?: (
            id: string,
            fileSize?: string
        ) => Pick<sendOptions, "content" | "embeds">;
    };
    /** The folder path to use for the Backup zip files, use `${process.cwd()}/:folder_name` to mark the folder to use. */
    folderPath?: string;
    /** The global ignore options */
    ignore?: BackupIgnore;
}

export interface BackupConnect {
    /** Should this backup connection be enabled? */
    enabled?: boolean;
    /** If the package should automatically fetch all databases with the url/local, this excludes (config, local, admin databases) */
    saveAllDatabases?: boolean;
    /** Ignore certain databases/collections for this connection only. */
    ignore?: BackupIgnore;
}

export interface BackupIgnore {
    /** The collection name(s) */
    collections?: string[];
    /** The database name(s) */
    databases?: string[];
}

export interface BackupConnectionWithURL extends BackupConnect {
    /** Include the database name at the end of the url (i.e: mongodb.net/:dbName?xxx) */
    url: string;
}

export interface BackupConnectionWithLocal extends BackupConnect {
    /** THe local database name to save (NOTE: To have the package save all databases locally use 'admin' for the name!) */
    name: string;
    /** The database username to use. */
    username?: string;
    /** The database password to use. */
    password?: string;
    /** THe database port to use. (default: 27017) */
    port?: number;
}

export type BackupConnections = XOR<
    BackupConnectionWithURL,
    BackupConnectionWithLocal
>;
