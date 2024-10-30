import EventEmitter from "eventemitter3";
import { GiveawayDatabase, GiveawayUser } from "../interfaces";

export class GiveawayEvents {
    #events = new EventEmitter();
    public on<E extends keyof GiveawayEventsList>(
        event: E,
        listener: (...args: GiveawayEventsList[E]) => Promise<unknown> | unknown
    ) {
        //@ts-ignore
        this.#events.on(event, listener);
        return this;
    }
    public emit<E extends keyof GiveawayEventsList>(
        event: E,
        ...args: GiveawayEventsList[E]
    ) {
        if (event !== "giveawayDebug") {
            this.#events.emit(EVENTS.all, event, ...args);
        }
        this.#events.emit(event, ...args);
        return this;
    }
}

export interface GiveawayEventsList {
    giveawayStart: [db: GiveawayDatabase];
    giveawayEnd: [db: GiveawayDatabase, winners: string[]];
    giveawayCancel: [db: GiveawayDatabase, reason: string];
    giveawayDelete: [db: GiveawayDatabase, reason: string];
    giveawayReroll: [db: GiveawayDatabase, rerolled: string[], modId: string];
    giveawayBulkDelete: [dbs: GiveawayDatabase[], reason: string];
    giveawayUserAdd: [db: GiveawayDatabase, user: GiveawayUser];
    giveawayUserRemove: [db: GiveawayDatabase, user: GiveawayUser];
    giveawayUserUpdate: [db: GiveawayDatabase, user: GiveawayUser];
    giveawayDebug: [...args: unknown[]];
    all: [event: keyof GiveawayEventsList, ...args: unknown[]];
}

export const EVENTS = {
    all: "all",
    giveawayUserAdd: "giveawayUserAdd",
    giveawayUserRemove: "giveawayUserRemove",
    giveawayUserUpdate: `giveawayUserUpdate`,
    giveawayStart: "giveawayStart",
    giveawayEnd: "giveawayEnd",
    giveawayCancel: "giveawayCancel",
    giveawayDelete: "giveawayDelete",
    giveawayBulkDelete: "giveawayBulkDelete",
    giveawayReroll: "giveawayReroll",
    giveawayDebug: "giveawayDebug",
} as const;
