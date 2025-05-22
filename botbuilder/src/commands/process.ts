import { is, make, sleep } from "@elara-services/utils";
import { RepliableInteraction } from "discord.js";
import { Interact } from "./pager";
import { compComment, interact } from "./utils";

export class ProcessInteraction {
    #step = 0;
    private int: Interact;
    #defWait = 0;
    #steps = make.array<{
        step: number;
        content: string;
        color: number;
        ephemeral: boolean;
        wait: number;
    }>();
    public constructor(
        public i: RepliableInteraction,
        steps = make.array<{
            content: string;
            color?: number;
            wait?: number;
            ephemeral?: boolean;
        }>(),
    ) {
        this.int = interact(i);
        if (is.array(steps)) {
            for (const s of steps) {
                this.add(s);
            }
        }
    }

    public setWait(ms: number) {
        this.#defWait = ms;
        return this;
    }

    #getNextStep() {
        return (
            this.#steps.sort((a, b) => (b.step || 0) - (a.step || 0))?.[0]
                ?.step || 0
        );
    }

    public add(options: {
        content: string;
        color?: number;
        ephemeral?: boolean;
        wait?: number;
    }) {
        const step = this.#getNextStep();
        this.#steps.push({
            step: step + 1,
            content: options.content,
            color: options.color || 0,
            ephemeral: options.ephemeral ?? false,
            wait: options.wait ?? 0,
        });
        return this;
    }
    public next(wait?: number) {
        return this.send(Math.floor(this.#step + 1), wait);
    }

    public async send(step: number, extraWait?: number) {
        const f = this.#steps.find((r) => r.step === step);
        if (!f) {
            return;
        }
        this.#step = f.step;
        const ii = await this.int[this.i.deferred ? "send" : "reply"]({
            ...compComment(f.content, f.color),
            flags: f.ephemeral ? 1 << 6 : undefined,
        });
        const wait = is.number(extraWait)
            ? extraWait
            : is.number(f.wait, false)
            ? f.wait
            : is.number(this.#defWait, false)
            ? this.#defWait
            : 0;
        if (is.number(wait)) {
            await sleep(wait);
        }
        return ii;
    }
}
