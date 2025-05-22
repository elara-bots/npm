import { Interactions } from "@elara-services/packages";
import {
    collector,
    colors,
    get,
    is,
    make,
    noop,
    snowflakes,
} from "@elara-services/utils";
import {
    ComponentType,
    TextInputStyle,
    type ButtonComponentData,
    type Interaction,
    type Message,
    type User,
} from "discord.js";
import type { AddPageData, CachedInt, PageData } from "./interfaces";
import { createContainer, interact, text } from "./utils";

export type Interact = ReturnType<typeof interact>;

export class Pager {
    public int: Interact;
    public user?: User;
    public time = get.mins(2);
    public pages = make.array<PageData>();
    #last?: string;
    public constructor(
        public m: Message,
        public i: CachedInt | Interaction,
    ) {
        this.int = interact(i);
    }

    public setLast(id?: string) {
        this.#last = id;
        return this;
    }

    public setUser(user: User) {
        this.user = user;
        return this;
    }

    public setTime(ms: number) {
        this.time = ms;
        return this;
    }

    public add(data: AddPageData[] | AddPageData) {
        for (const d of is.array(data) ? data : [data]) {
            this.pages.push({
                id: d.id || snowflakes.generate(),
                data: d.data,
            });
        }
        return this;
    }

    public remove(id: string) {
        this.pages = this.pages.filter((c) => c.id !== id);
        return this;
    }

    public getPageButtons(
        disabled?: Partial<{
            back: boolean;
            forward: boolean;
            selector: boolean;
        }>,
    ) {
        const back = disabled?.back || false;
        const forward = disabled?.forward || false;
        const selector = disabled?.selector || false;
        return {
            type: 1,
            components: [
                Interactions.button({
                    disabled: back,
                    emoji: { id: "711655289514098718" },
                    id: `pages:back`,
                }),
                Interactions.button({
                    disabled: forward,
                    emoji: { id: "806636210004819968" },
                    id: `pages:forward`,
                }),
                Interactions.button({
                    disabled: selector,
                    emoji: { id: `1027278705409658930` },
                    id: `pages:goto`,
                }),
            ],
        };
    }

    public async set(
        id: string,
        reply = true,
        int?: Interact,
        disabled = false,
    ) {
        const data = this.pages.find((c) => c.id === id);
        if (data && is.object(data.data, true)) {
            this.setLast(data.id);
            if (disabled) {
                // @ts-ignore
                data.data.components = data.data.components.map((c) => {
                    const second = c.components[c.components.length - 2] as {
                        type: number;
                        components: ButtonComponentData[];
                    };
                    if (second && is.array(second.components)) {
                        second.components = second.components.map((rr) => {
                            if (
                                [
                                    ComponentType.Button,
                                    ComponentType.ChannelSelect,
                                    ComponentType.MentionableSelect,
                                    ComponentType.RoleSelect,
                                    ComponentType.StringSelect,
                                    ComponentType.UserSelect,
                                ].includes(rr.type)
                            ) {
                                rr.disabled = true;
                            }
                            return rr;
                        });
                    }

                    const last = c.components[c.components.length - 1];
                    // @ts-ignore
                    if (
                        last &&
                        last.content &&
                        last.content.includes("Expires")
                    ) {
                        // @ts-ignore
                        last.content = `${
                            last.content.split("Expires")[0]
                        } Expired`;
                    }
                    return c;
                });
            }
            return await (int || this.int)[reply ? "reply" : "send"](data.data);
        }
        return null;
    }

    public async run(user?: User) {
        if (user) {
            this.setUser(user);
        }
        if (!is.array(this.pages)) {
            return await this.int.send({
                components: [
                    createContainer({
                        components: [text(`❌ No pages added.`)],
                        color: colors.red,
                    }),
                ],
            });
        }
        if (this.pages.length === 1) {
            return await this.set(this.pages[0].id, false);
        }
        await this.set(this.pages[0].id, false);
        return collector.components(this.m, {
            time: this.time,
            filter: (ii) =>
                (this.user ? ii.user.id === this.user.id : true) &&
                ii.customId.startsWith("pages:"),
            end: async () => {
                const data =
                    this.pages.find((c) => c.id === this.#last) ||
                    this.pages[0];
                if (is.object(data, true)) {
                    return await this.set(data.id, false, undefined, true);
                }
            },
            on: async (_, i) => {
                const [current, total] = JSON.stringify(i.message.components)
                    .split("Page: ")[1]
                    .split(" ·")[0]
                    .split("/")
                    .map((c) => parseInt(c) - 1);
                if (i.customId.includes("goto")) {
                    const id = snowflakes.generate();
                    await i
                        .showModal({
                            customId: id,
                            title: `Go to Page (${current + 1}/${total + 1})`,
                            components: [
                                // @ts-ignore
                                Interactions.textInput(
                                    {
                                        id: `page`,
                                        required: true,
                                        title: `Page`,
                                        min: 1,
                                        max: 20,
                                        style: TextInputStyle.Short,
                                    },
                                    true,
                                ),
                            ],
                        })
                        .catch(noop);
                    const s = await i
                        .awaitModalSubmit({
                            time: get.secs(30),
                            filter: async (iii) => iii.user.id === i.user.id,
                        })
                        .catch(noop);
                    if (!s) {
                        return;
                    }
                    await s.deferUpdate().catch(noop);
                    let page = parseInt(s.fields.getTextInputValue("page")) - 1;
                    if (page < 0) {
                        page = 0;
                    } else if (page > this.pages.length - 1) {
                        page = this.pages.length - 1;
                    }
                    const p = this.pages[page];
                    if (!p) {
                        return;
                    }
                    return await this.set(p.id, false);
                }
                const c = interact(i);
                const b =
                    this.pages[Math.floor(current - 1)] || this.pages[total];
                const n = this.pages[Math.floor(current + 1)] || this.pages[0];
                const [, type] = i.customId.split(":");
                return await this.set((type === "back" ? b : n).id, true, c);
            },
        });
    }
}
