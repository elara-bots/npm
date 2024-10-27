import { is } from "@elara-services/utils";
import { AddGiveaway, Entries, RoleTypes } from "../interfaces";

export class GiveawayBuilder {
    public constructor(public data: Partial<AddGiveaway> = {}) {}

    public addEntry(roles: string[], amount = 1) {
        if (is.array(this.data.entries)) {
            this.data.entries.push({ roles, amount });
        } else {
            this.data.entries = [{ roles, amount }];
        }
        return this;
    }

    public setEntries(entries: Entries[]) {
        for (const e of entries) {
            this.addEntry(e.roles, e.amount);
        }
        return this;
    }

    public setChannel(channelId: string) {
        this.data.channelId = channelId;
        return this;
    }

    public setWinners(amount: number) {
        this.data.winners = amount;
        return this;
    }

    /**
     * All mentions need to be either "<@USER_ID>" for users or "<@&ROLE_ID>" for roles.
     */
    public setMentions(mentions: string[]) {
        const roles = mentions
            .filter((c) => c.includes("<@&"))
            .map((c) => ({ type: "role" as const, id: this.#stripMention(c) }));
        const users = mentions
            .filter((c) => !roles.some((rr) => rr.id.includes(c)))
            .map((c) => ({ type: "user" as const, id: this.#stripMention(c) }));
        this.data.mentions = [...users, ...roles];
        return this;
    }

    public setHost(userId: string, mention = true) {
        this.data.host = {
            id: userId,
            mention,
        };
        return this;
    }

    public setPrize(str: string) {
        this.data.prize = str;
        return this;
    }

    public setEnd(date: Date | string) {
        this.data.end = date instanceof Date ? date.toISOString() : date;
        return this;
    }

    /**
     * How many ms until the giveaway is over, this can be used instead of the "<GiveawayBuilder>.setEnd()" version
     */
    public setEndTimer(ms: number) {
        this.data.end = new Date(Date.now() + ms).toISOString();
        return this;
    }

    public setButton(options: Partial<AddGiveaway["button"]>) {
        if (options?.emoji) {
            if (this.data.button) {
                this.data.button.emoji = options.emoji;
            } else {
                this.data.button = {
                    emoji: options.emoji,
                };
            }
        }
        if (options?.style) {
            if (this.data.button) {
                this.data.button.style = options.style;
            } else {
                this.data.button = {
                    style: options.style,
                };
            }
        }
        return this;
    }

    public setMessage(options: AddGiveaway["options"]) {
        this.data.options = options;
        return this;
    }

    public setRequiredRoles(roles: string[]) {
        return this.#handleRoles(roles, "required");
    }

    public setAddRoles(roles: string[]) {
        return this.#handleRoles(roles, "add");
    }

    public setRemoveRoles(roles: string[]) {
        return this.#handleRoles(roles, "remove");
    }

    #stripMention(str: string) {
        return str.replace(/<@(&)?|>/gi, "");
    }

    #handleRoles(roles: string[], type: RoleTypes) {
        if (this.data.roles) {
            this.data.roles[type] = roles.map((c) => this.#stripMention(c));
        } else {
            this.data.roles = {
                [type]: roles.map((c) => this.#stripMention(c)),
            };
        }
        return this;
    }

    public toJSON() {
        if (!this.data.channelId || !this.data.end || !this.data.prize) {
            throw new Error(
                `You failed to provide a 'channelId', 'end' or 'prize'`
            );
        }
        return {
            channelId: this.data.channelId,
            end: new Date(this.data.end).toISOString(),
            prize: this.data.prize,
            button: this.data.button && {
                emoji: this.data.button?.emoji || "🎉",
                style: this.data.button?.style || "GREEN",
            },
            host: this.data.host && {
                id: this.data.host?.id,
                mention: is.boolean(this.data.host?.mention)
                    ? this.data.host.mention
                    : true,
            },
            mentions: is.array(this.data.mentions)
                ? this.data.mentions
                : undefined,
            options: this.data.options,
            roles: {
                add: is.array(this.data.roles?.add)
                    ? this.data.roles?.add || []
                    : [],
                remove: is.array(this.data.roles?.remove)
                    ? this.data.roles?.remove || []
                    : [],
                required: is.array(this.data.roles?.required)
                    ? this.data.roles?.required || []
                    : [],
            },
            winners: is.number(this.data.winners) ? this.data.winners : 1,
            entries: is.array(this.data.entries) ? this.data.entries : [],
        };
    }
}
