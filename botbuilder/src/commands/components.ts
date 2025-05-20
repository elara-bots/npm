import {
    embedComment,
    getInteractionResponder,
    getInteractionResponders,
    is,
    isOriginalInteractionUser,
    proper,
    status,
} from "@elara-services/utils";
import {
    GuildMember,
    ModalSubmitInteraction,
    type AnySelectMenuInteraction,
    type ButtonInteraction,
    type Collection,
    type Interaction,
} from "discord.js";
import { Status } from "./interfaces";

export async function handleComponentInteractions<
    I extends Interaction,
    C extends BuildComponentOptions<any>,
>(i: I, components: Collection<string, C>) {
    const check = (f: C) => {
        if (is.object(f.locked, true)) {
            if (f.locked.permissions && is.func(f.locked.permissions)) {
                if (!i.member || !(i.member instanceof GuildMember)) {
                    return status.error(
                        `Unable to find your member information`,
                    );
                }
                const rr = f.locked.permissions(i.member);
                if (!rr.status) {
                    return rr;
                }
            }
            if ("message" in i && i.message) {
                if (
                    f.locked.originalUser === true &&
                    !isOriginalInteractionUser(i as any)
                ) {
                    return status.error(
                        `Only the original interaction user can use this ${proper(
                            f.type || "BUTTON",
                        )}`,
                    );
                }
            }
            const roles =
                i.member instanceof GuildMember
                    ? [...i.member.roles.cache.keys()]
                    : is.array(i.member?.roles)
                    ? i.member?.roles || []
                    : [];
            if (
                is.array(f.locked.users) &&
                !f.locked.users.includes(i.user.id)
            ) {
                return status.error(
                    `You don't have access to use this ${proper(
                        f.type || "BUTTON",
                    )}`,
                );
            }
            if (
                is.array(f.locked.roles) &&
                !roles.some((c) => f.locked?.roles?.includes(c))
            ) {
                return status.error(
                    `You don't have access to use this ${proper(
                        f.type || "BUTTON",
                    )}`,
                );
            }
        }
        return status.success(`All good`);
    };
    const r = getInteractionResponder(i as any);
    if (i.isButton()) {
        const find = components.find(
            (r) => r.type === "BUTTON" && r.enabled === true && r.customId(i),
        );
        if (find) {
            const c = check(find);
            if (!c.status) {
                return r.reply({
                    ephemeral: true,
                    ...embedComment(c.message, "Red"),
                });
            }
            return void (await find.execute(i, r));
        }
    }
    if (i.isAnySelectMenu()) {
        const find = components.find(
            (r) =>
                r.type === "SELECT_MENU" && r.enabled === true && r.customId(i),
        );
        if (find) {
            const c = check(find);
            if (!c.status) {
                return r.reply({
                    ephemeral: true,
                    ...embedComment(c.message, "Red"),
                });
            }
            return void (await find.execute(i, r));
        }
    }
    if (i.isModalSubmit()) {
        const find = components.find(
            (r) => r.type === "MODAL" && r.enabled === true && r.customId(i),
        );
        if (find) {
            const c = check(find);
            if (!c.status) {
                return r.reply({
                    ephemeral: true,
                    ...embedComment(c.message, "Red"),
                });
            }
            return void (await find.execute(i, r));
        }
    }
}

export const build = {
    component: <O extends BuildComponentOptions<any>>(options: O): O => {
        if (!is.boolean(options.enabled)) {
            options.enabled = true;
        }
        if (!options.customId || typeof options.customId !== "function") {
            throw new Error(`No 'customId' function provided.`);
        }
        if (!options.execute || typeof options.execute !== "function") {
            throw new Error(`No 'execute' function provided.`);
        }
        if (!is.string(options.type)) {
            throw new Error(`No 'type' option provided.`);
        }
        return options as O;
    },
    components: {
        button: (options: BuildComponentOptions<ButtonInteraction>) => {
            if (!is.string(options.type)) {
                options.type = "BUTTON";
            }
            return build.component(options);
        },
        select: (options: BuildComponentOptions<AnySelectMenuInteraction>) => {
            if (!is.string(options.type)) {
                options.type = "SELECT_MENU";
            }
            return build.component(options);
        },
    },
    modal: (options: BuildComponentOptions<ModalSubmitInteraction>) => {
        if (!is.string(options.type)) {
            options.type = "MODAL";
        }
        return build.component(options);
    },
};

export interface BuildComponentOptions<I> {
    enabled?: boolean;

    type?: "BUTTON" | "SELECT_MENU" | "MODAL";
    /**
     * The filter to use to execute the run function for the component
     */
    customId: (i: I) => boolean;

    locked?: Partial<{
        /** If the button should be locked to the original interaction user. */
        originalUser: boolean;
        /** This custom ID will be locked to these users only. */
        users: string[];
        /** This custom ID will be locked to these roles only. */
        roles: string[];
        /** This custom ID will be locked to these permissions only. */
        permissions: (member: GuildMember) => Status;
    }>;

    execute: (i: I, r: getInteractionResponders) => Promise<unknown> | unknown;
}
