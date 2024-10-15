import {
    chunk,
    discord,
    hasBit,
    is,
    ms,
    snowflakes,
    status,
} from "@elara-services/utils";
import { Leveling } from "..";
import { Leaderboards, RankProfiles } from "../canvas";
import type {
    AnnounceToggleTypes,
    CachedOptions,
    CanvasLeaderboardTypes,
    CanvasRankProfileTypes,
    CanvasResponse,
    CanvasResponseWithQuery,
    ColorType,
    IgnoreTypes,
    LeaderboardCanvasOptions,
    LeaderboardFormatted,
    LeaderboardFormattedResponse,
    LeaderboardOptions,
    LeaderboardUser,
    MemberPresenceStatus,
    OptionalOptions,
    ServerToggleTypes,
    Settings,
    UserToggles,
    Users,
    Weekly,
} from "../interfaces";
import {
    colors,
    fetchAllUsers,
    getClientIntents,
    getGuildIcon,
    getUserAvatar,
    incUserStat,
    save,
    tog,
    xpFor,
} from "../utils";

const message = `Unable to find/create the user's profile.`;
const server_not_found = `Unable to find/create the server's data.`;
const toggle = (bool: boolean) => (bool ? `Enabled` : `Disabled`);

export class API {
    #client: Leveling;
    public constructor(client: Leveling) {
        this.#client = client;
    }

    #displayUser(userId: string) {
        const user = this.#client.client.users.resolve(userId);
        return `\`@${user?.tag || "Unknown User"}\` (${userId})`;
    }

    /**
     * Returns the server name (ID) string
     */
    #getServer(guildId: string) {
        return `\`${
            this.#client.client.guilds.resolve(guildId)?.name ||
            "Unknown Server"
        }\` (${guildId}) server`;
    }

    #getSettings(guildId: string) {
        // @ts-ignore
        return this.#client.getSettings(guildId);
    }

    #getUser(userId: string, guildId: string) {
        // @ts-ignore
        return this.#client.getUser(userId, guildId);
    }

    async #handleIgnore(guildId: string, type: IgnoreTypes, arr: string[]) {
        const data = await this.#getSettings(guildId);
        if (!data) {
            return status.error(server_not_found);
        }
        for (const a of arr) {
            if (data.ignore[type].includes(a)) {
                data.ignore[type] = data.ignore[type].filter((c) => c !== a);
            } else {
                data.ignore[type].push(a);
            }
        }
        await save(data);
        return status.success(
            `Updated (${type}) ignore list in ${this.#getServer(guildId)}`,
        );
    }

    public get servers() {
        return {
            /**
             * Get a certain server's data
             */
            get: async (guildId: string) => {
                const data = await this.#getSettings(guildId);
                if (!data) {
                    return status.error(server_not_found);
                }
                return status.data(data.toJSON());
            },

            setWebhook: async (
                guildId: string,
                options: { name?: string | null; image?: string | null },
            ) => {
                const r = await this.#getSettings(guildId);
                if (!r) {
                    return status.error(server_not_found);
                }
                if (!is.object(options)) {
                    return status.error(`You didn't provide any options.`);
                }
                const change = [];
                if (is.string(options.name)) {
                    change.push(`[NAME]: Set to: ${options.name}`);
                    r.webhook.name = options.name;
                } else if (is.null(options.name)) {
                    r.webhook.name = "";
                    change.push(`[NAME]: Reset`);
                }
                if (is.string(options.image)) {
                    if (
                        !options.image.match(
                            /https:\/\/|.(png|jpg|webp|jpeg)/gi,
                        )
                    ) {
                        return status.error(`Invalid image provided.`);
                    }
                    change.push(`[IMAGE]: Set to: ${options.image}`);
                    r.webhook.image = options.image;
                } else if (is.null(options.image)) {
                    change.push(`[IMAGE]: Reset`);
                    r.webhook.image = "";
                }
                if (!is.array(change)) {
                    return status.error(`Nothing needed to be changed.`);
                }
                await save(r);
                return status.success(
                    `Updated the following:\n${change.join("\n")}`,
                );
            },

            /**
             * Fetch multiple servers data
             */
            fetchAll: async (guildIds?: string[]) => {
                const data = await this.#client.dbs.settings
                    .find(
                        is.array(guildIds)
                            ? {
                                  guildId: {
                                      $in: guildIds,
                                  },
                              }
                            : {},
                    )
                    .lean()
                    .catch(() => []);
                if (!is.array(data)) {
                    return status.error(`Unable to fetch any server data.`);
                }
                return status.data(data);
            },

            /**
             * Toggle on/off certain features for the server.
             */
            toggle: async (guildId: string, type: ServerToggleTypes) => {
                const data = await this.#getSettings(guildId);
                if (!data) {
                    return status.error(server_not_found);
                }
                if (type === "useWebhook") {
                    data.toggles.useWebhook = tog(data.toggles.useWebhook);
                    await save(data);
                    return status.success(
                        `${toggle(
                            data.toggles.useWebhook,
                        )} useWebhook for ${this.#getServer(guildId)}`,
                    );
                }
                if (type === "leveling") {
                    data.enabled = tog(data.enabled);
                    await save(data);
                    return status.success(
                        `${toggle(data.enabled)} leveling for ${this.#getServer(
                            guildId,
                        )}`,
                    );
                } else if (type === "resetOnLeave") {
                    data.toggles.resetOnLeave = tog(data.toggles.resetOnLeave);
                    await save(data);
                    return status.success(
                        `${toggle(
                            data.toggles.resetOnLeave,
                        )} resetOnLeave for ${this.#getServer(guildId)}`,
                    );
                } else if (type === "stackRoles") {
                    data.toggles.stackRoles = tog(data.toggles.stackRoles);
                    await save(data);
                    return status.success(
                        `${toggle(
                            data.toggles.stackRoles,
                        )} stack roles for ${this.#getServer(guildId)}`,
                    );
                } else if (type === "weeklyleaderboard") {
                    data.toggles.weekly.track = tog(data.toggles.weekly.track);
                    await save(data);
                    return status.success(
                        `${toggle(
                            data.toggles.weekly.track,
                        )} weekly leaderboard for ${this.#getServer(guildId)}`,
                    );
                } else if (type === "voice.xp") {
                    data.toggles.voice.xp = tog(data.toggles.voice.xp);
                    await save(data);
                    return status.success(
                        `${toggle(
                            data.toggles.voice.xp,
                        )} voice earning for ${this.#getServer(guildId)}`,
                    );
                } else if (type === "voice.unmutedRequired") {
                    data.toggles.voice.shouldBeUnmuted = tog(
                        data.toggles.voice.shouldBeUnmuted,
                    );
                    await save(data);
                    return status.success(
                        `${toggle(
                            data.toggles.voice.shouldBeUnmuted,
                        )} talking required for voice earning for ${this.#getServer(
                            guildId,
                        )}`,
                    );
                } else if (type === "weekly.announce") {
                    data.announce.weekly.enabled = tog(
                        data.announce.weekly.enabled,
                    );
                    await save(data);
                    return status.success(
                        `${toggle(
                            data.announce.weekly.enabled,
                        )} weekly leaderboard announcements for ${this.#getServer(
                            guildId,
                        )}`,
                    );
                } else if (type === "earnXPOnSlashCommands") {
                    data.toggles.earnXPOnSlashCommands = tog(
                        data.toggles.earnXPOnSlashCommands,
                    );
                    await save(data);
                    return status.success(
                        `${toggle(
                            data.toggles.earnXPOnSlashCommands,
                        )} earning XP for \`/\` commands for ${this.#getServer(
                            guildId,
                        )}`,
                    );
                }
                return status.error(
                    `You failed to provide any valid toggle options.`,
                );
            },

            /**
             * Set the cooldown for XP earned on a certain server or create a custom cooldown for certain roles.
             * NOTE: This is in seconds!
             */
            cooldown: async (
                guildId: string,
                seconds: number,
                roles?: string[],
            ) => {
                const data = await this.#getSettings(guildId);
                if (!data) {
                    return status.error(server_not_found);
                }
                const time = ms.get(seconds * 1000, true);
                const str = [];
                if (is.array(roles, false)) {
                    const changes = [];
                    const find = data.cooldowns.find(
                        (c) => c.seconds === seconds,
                    );
                    if (find) {
                        for (const role of roles) {
                            if (find.roles.includes(role)) {
                                changes.push(`- ${role}`);
                                find.roles = find.roles.filter(
                                    (c) => c !== role,
                                );
                            } else {
                                changes.push(`+ ${role}`);
                                find.roles.push(role);
                            }
                        }
                        if (!is.array(find.roles)) {
                            data.cooldowns = data.cooldowns.filter(
                                (c) => c.seconds !== seconds,
                            );
                        }
                    } else {
                        changes.push(...roles.map((c) => `+ ${c}`));
                        data.cooldowns.push({ seconds, roles });
                    }
                    str.push(
                        `Set a custom cooldown (${time}) on ${this.#getServer(
                            guildId,
                        )} and updated for the following roles:\n${changes.join(
                            "\n",
                        )}`,
                    );
                } else {
                    str.push(
                        `Set the main cooldown (${time}) on ${this.#getServer(
                            guildId,
                        )}`,
                    );
                    data.cooldown = seconds;
                }
                await save(data);
                return status.success(str.join(" "));
            },

            /**
             * Set the min/max XP earned for messages on a certain server.
             */
            setXP: async (
                guildId: string,
                options: { min?: number; max?: number },
            ) => {
                const data = await this.#getSettings(guildId);
                if (!data) {
                    return status.error(server_not_found);
                }
                const changes = [];
                if (is.number(options.min)) {
                    changes.push(`min (${options.min})`);
                    data.xp.min = options.min;
                }
                if (is.number(options.max)) {
                    changes.push(`max (${options.max})`);
                    data.xp.max = options.max;
                }
                await save(data);
                return status.success(
                    `I've set the XP (${changes.join(
                        ", ",
                    )}) for ${this.#getServer(guildId)}`,
                );
            },

            weekly: {
                /**
                 * Set/Reset a certain channel for the weekly leaderboard announcements
                 */
                setChannel: async (guildId: string, channelId: string) => {
                    const data = await this.#getSettings(guildId);
                    if (!data) {
                        return status.error(server_not_found);
                    }
                    let reason = ``;
                    if (data.announce.weekly.channel === channelId) {
                        data.announce.weekly.channel = "";
                        reason = `I've reset the weekly announcement channel for ${this.#getServer(
                            guildId,
                        )}`;
                    } else {
                        data.announce.weekly.channel = channelId;
                        reason = `I've set the weekly announcement channel to (${channelId}) for ${this.#getServer(
                            guildId,
                        )}`;
                    }
                    await save(data);
                    return status.success(reason);
                },

                /**
                 * Set/Reset weekly leaderboard ping roles
                 * These role(s) will get mentioned when a new weekly leaderboard is posted.
                 */
                setRoles: async (guildId: string, roles: string[]) => {
                    const data = await this.#getSettings(guildId);
                    if (!data) {
                        return status.error(server_not_found);
                    }
                    let reason = "";
                    if (!is.array(data.announce.weekly.roles)) {
                        reason = `Added (${
                            roles.length
                        }) roles to the weekly announcement ping roles to ${this.#getServer(
                            guildId,
                        )}`;
                        data.announce.weekly.roles = roles;
                    } else {
                        const arr = [];
                        for (const role of roles) {
                            if (data.announce.weekly.roles.includes(role)) {
                                arr.push(`- ${role}`);
                                data.announce.weekly.roles =
                                    data.announce.weekly.roles.filter(
                                        (c) => c !== role,
                                    );
                            } else {
                                arr.push(`+ ${role}`);
                                data.announce.weekly.roles.push(role);
                            }
                        }
                        if (is.array(arr)) {
                            reason = `Updated the weekly announcement ping roles:\n${arr.join(
                                " | ",
                            )} in ${this.#getServer(guildId)}`;
                        }
                    }
                    await save(data);
                    return status.success(reason);
                },
            },

            /**
             * Import leaderboards from other bots
             */
            import: async (
                guildId: string,
                targetGuildId: string,
                type: "amari" | "mee6" = "amari",
            ) => {
                const data = await fetchAllUsers(targetGuildId, type);
                if (!is.array(data)) {
                    return status.error(
                        `Unable to find anyone from (${type}) bot that needed to be imported.`,
                    );
                }
                const newData = data.map((c) => ({
                    guildId,
                    userId: c.id,
                    level: c.level,
                    xp: c.level * c.level * 100,
                    color: "",
                    background: "",
                    stats: {
                        messages: c.messages,
                        voice: 0,
                    },
                    toggles: {
                        dms: true,
                        locked: false,
                        pings: true,
                    },
                    cooldowns: [],
                }));
                const dbs = await this.#client.dbs.users
                    .find({ guildId })
                    .catch(console.error);
                let amount = 0;
                if (!is.array(dbs)) {
                    amount = newData.length;
                    await this.#client.dbs.users
                        .insertMany(newData)
                        .catch(console.error);
                } else {
                    const insert = newData.filter(
                        (c) => !dbs.find((r) => c.userId === r.id),
                    );
                    if (is.array(insert)) {
                        amount = insert.length;
                        await this.#client.dbs.users
                            .insertMany(insert)
                            .catch(console.error);
                    }
                }
                return status.success(
                    `I've imported (${amount}) users from (${type}) leaderboard for ${this.#getServer(
                        guildId,
                    )}`,
                );
            },

            announce: {
                /**
                 * Toggle on/off certain features for a certain server.
                 */
                toggle: async (guildId: string, type: AnnounceToggleTypes) => {
                    const data = await this.#getSettings(guildId);
                    if (!data) {
                        return status.error(server_not_found);
                    }
                    if (type === "ping") {
                        data.announce.channel.ping = tog(
                            data.announce.channel.ping,
                        );
                        await save(data);
                        return status.success(
                            data.announce.channel.ping
                                ? `I'll now mention users when announcing levels`
                                : `I'll not mention users when announcing levels`,
                        );
                    } else if (type === "onlyRegisteredLevels") {
                        data.toggles.onlyRegisteredLevels = tog(
                            data.toggles.onlyRegisteredLevels,
                        );
                        await save(data);
                        return status.success(
                            data.toggles.onlyRegisteredLevels
                                ? `I'll only announce levels that is registered.`
                                : `I'll announce all level ups`,
                        );
                    }
                    data.announce[type].enabled = tog(
                        data.announce[type].enabled,
                    );
                    await save(data);
                    return status.success(
                        `${toggle(
                            data.announce[type].enabled,
                        )} (${type}) announcements for ${this.#getServer(
                            guildId,
                        )}`,
                    );
                },

                /**
                 * Set/Reset the content/embeds for certain types on a certain server.
                 */
                setMessage: async (
                    guildId: string,
                    type: "dm" | "channel",
                    options: OptionalOptions,
                ) => {
                    const data = await this.#getSettings(guildId);
                    if (!data) {
                        return status.error(server_not_found);
                    }
                    if (is.string(options.content, false)) {
                        data.announce[type].options.content = options.content;
                    }
                    if (is.array(options.embeds, false)) {
                        data.announce[type].options.embeds = options.embeds;
                    }
                    await save(data);
                    return status.success(
                        `Updated (${type}) announcement message for ${this.#getServer(
                            guildId,
                        )}`,
                    );
                },

                /**
                 * Set/Reset the announcement channel for level ups.
                 */
                setChannel: async (guildId: string, channelId: string) => {
                    const data = await this.#getSettings(guildId);
                    if (!data) {
                        return status.error(server_not_found);
                    }
                    data.announce.channel.channel = channelId;
                    await save(data);
                    return status.success(
                        channelId
                            ? `I've set the announce channel to <#${channelId}> (${channelId}) in ${this.#getServer(
                                  guildId,
                              )}`
                            : `Reset the announce channel in ${this.#getServer(
                                  guildId,
                              )}`,
                    );
                },
            },

            levels: {
                /**
                 * Add a level to a certain server.
                 * NOTE: (add: Will add roles to the users once they level up, remove: Will remove roles from the user once they level up)
                 */
                add: async (
                    guildId: string,
                    level: number,
                    options?: {
                        levelName?: string;
                        add?: string[];
                        remove?: string[];
                        options?: OptionalOptions;
                    },
                ) => {
                    const data = await this.#getSettings(guildId);
                    if (!data) {
                        return status.error(server_not_found);
                    }
                    const roles = {
                        add: options?.add || [],
                        remove: options?.remove || [],
                    };
                    const find = data.levels.find((c) => c.level === level);
                    if (find) {
                        return status.error(
                            `Level (${level}) is already registered.`,
                        );
                    }
                    data.levels.push({
                        level,
                        levelName: options?.levelName || `Level ${level}`,
                        roles,
                        options: {
                            content: options?.options?.content || "",
                            embeds: options?.options?.embeds || [],
                        },
                    });
                    await save(data);
                    const str = [];
                    if (is.array(roles.add)) {
                        str.push(
                            `- Add Roles: ${roles.add
                                .map((c) => `<@&${c}>`)
                                .join(", ")}`,
                        );
                    }
                    if (is.array(roles.remove)) {
                        str.push(
                            `- Remove Roles: ${roles.remove
                                .map((c) => `<@&${c}>`)
                                .join(", ")}`,
                        );
                    }
                    return status.success(
                        `Registered (${level}) Level on ${this.#getServer(
                            guildId,
                        )}${str.length ? `\n${str.join("\n")}` : ""}`,
                    );
                },

                /**
                 * Remove a certain level from a certain server.
                 */
                remove: async (guildId: string, level: number) => {
                    const data = await this.#getSettings(guildId);
                    if (!data) {
                        return status.error(server_not_found);
                    }
                    const find = data.levels.find((c) => c.level === level);
                    if (!find) {
                        return status.error(
                            `Unable to find (${level}) level in ${this.#getServer(
                                guildId,
                            )}`,
                        );
                    }
                    data.levels = data.levels.filter((c) => c.level !== level);
                    await save(data);
                    return status.success(
                        `Removed (${level}) level from ${this.#getServer(
                            guildId,
                        )}`,
                    );
                },

                /**
                 * Set/Reset a certain level's (ADD) roles
                 * These roles will get added once the user reaches this level
                 */
                addRoles: async (
                    guildId: string,
                    level: number,
                    roles: string[],
                ) => {
                    const data = await this.#getSettings(guildId);
                    if (!data) {
                        return status.error(server_not_found);
                    }
                    const find = data.levels.find((c) => c.level === level);
                    if (!find) {
                        return status.error(
                            `Unable to find (${level}) level in ${this.#getServer(
                                guildId,
                            )}`,
                        );
                    }
                    for (const role of roles) {
                        if (find.roles.add.includes(role)) {
                            find.roles.add = find.roles.add.filter(
                                (c) => c !== role,
                            );
                        } else {
                            find.roles.add.push(role);
                        }
                    }
                    await save(data);
                    return status.success(
                        `Updated (${level}) level's (add) roles in ${this.#getServer(
                            guildId,
                        )}`,
                    );
                },

                /**
                 * Set/Reset a certain level's (REMOVE) roles
                 * These roles will get removed once the user reaches this level
                 */
                removeRoles: async (
                    guildId: string,
                    level: number,
                    roles: string[],
                ) => {
                    const data = await this.#getSettings(guildId);
                    if (!data) {
                        return status.error(server_not_found);
                    }
                    const find = data.levels.find((c) => c.level === level);
                    if (!find) {
                        return status.error(
                            `Unable to find (${level}) level in ${this.#getServer(
                                guildId,
                            )}`,
                        );
                    }
                    for (const role of roles) {
                        if (find.roles.remove.includes(role)) {
                            find.roles.remove = find.roles.remove.filter(
                                (c) => c !== role,
                            );
                        } else {
                            find.roles.remove.push(role);
                        }
                    }
                    await save(data);
                    return status.success(
                        `Updated (${level}) level's (remove) roles in ${this.#getServer(
                            guildId,
                        )}`,
                    );
                },

                /**
                 * Set/Reset a certain level's announcement message for a certain server.
                 */
                setMessage: async (
                    guildId: string,
                    options: OptionalOptions,
                    level: number,
                ) => {
                    const data = await this.#getSettings(guildId);
                    if (!data) {
                        return status.error(server_not_found);
                    }
                    const find = data.levels.find((c) => c.level === level);
                    if (!find) {
                        return status.error(
                            `Unable to find (${level}) level in ${this.#getServer(
                                guildId,
                            )}`,
                        );
                    }
                    if (is.string(options.content, false)) {
                        find.options.content = options.content;
                    }
                    if (is.array(options.embeds, false)) {
                        find.options.embeds = options.embeds;
                    }
                    await save(data);
                    return status.success(
                        `Updated (${level}) level's message options in ${this.#getServer(
                            guildId,
                        )}`,
                    );
                },

                get: async (guildId: string, level: number) => {
                    const data = await this.#getSettings(guildId);
                    if (!data) {
                        return status.error(server_not_found);
                    }
                    const find = data.levels.find((c) => c.level === level);
                    if (!find) {
                        return status.error(`Unable to find level (${level})`);
                    }
                    return status.data(find);
                },

                getLevelName: async (guildId: string, level: number) => {
                    const data = await this.#getSettings(guildId);
                    if (!data) {
                        return status.success(`Level ${level}`);
                    }
                    const find = data.levels.find((c) => c.level === level);
                    if (!find) {
                        return status.success(`Level ${level}`);
                    }
                    return status.success(
                        find.levelName || `Level ${find.level}`,
                    );
                },
            },

            multipliers: {
                /**
                 * Add a multiplier to a certain server.
                 */
                add: async (
                    guildId: string,
                    multiplier: number,
                    options?: {
                        roles?: string[];
                        channels?: string[];
                    },
                ) => {
                    const data = await this.#getSettings(guildId);
                    if (!data) {
                        return status.error(server_not_found);
                    }
                    const find = data.multipliers.find(
                        (c) => c.multiplier === multiplier,
                    );
                    if (find) {
                        return status.error(
                            `Multiplier (${multiplier}) already exists in ${this.#getServer(
                                guildId,
                            )}`,
                        );
                    }
                    data.multipliers.push({
                        multiplier,
                        channels: options?.channels || [],
                        roles: options?.roles || [],
                    });
                    await save(data);
                    return status.success(
                        `Added (${multiplier}) multiplier to ${this.#getServer(
                            guildId,
                        )}`,
                    );
                },

                /**
                 * Remove a multiplier from a certain server.
                 */
                remove: async (guildId: string, multiplier: number) => {
                    const data = await this.#getSettings(guildId);
                    if (!data) {
                        return status.error(server_not_found);
                    }
                    const find = data.multipliers.find(
                        (c) => c.multiplier === multiplier,
                    );
                    if (!find) {
                        return status.error(
                            `Multiplier (${multiplier}) doesn't exist in ${this.#getServer(
                                guildId,
                            )}`,
                        );
                    }
                    data.multipliers = data.multipliers.filter(
                        (c) => c.multiplier !== find.multiplier,
                    );
                    await save(data);
                    return status.success(
                        `Removed (${multiplier}) multiplier to ${this.#getServer(
                            guildId,
                        )}`,
                    );
                },

                /**
                 * Add/Remove certain channels from being able to use this multiplier in a certain server.
                 */
                channels: async (
                    guildId: string,
                    multiplier: number,
                    channels: string[],
                ) => {
                    const data = await this.#getSettings(guildId);
                    if (!data) {
                        return status.error(server_not_found);
                    }
                    const find = data.multipliers.find(
                        (c) => c.multiplier === multiplier,
                    );
                    if (!find) {
                        return status.error(
                            `Multiplier (${multiplier}) doesn't exist in ${this.#getServer(
                                guildId,
                            )}`,
                        );
                    }
                    for (const channel of channels) {
                        if (find.channels.includes(channel)) {
                            find.channels = find.channels.filter(
                                (c) => c !== channel,
                            );
                        } else {
                            find.channels.push(channel);
                        }
                    }
                    await save(data);
                    return status.success(
                        `Multiplier (${multiplier}) channels is now updated.`,
                    );
                },

                /**
                 * Add/Remove certain roles from being able to use this multiplier in a certain server.
                 */
                roles: async (
                    guildId: string,
                    multiplier: number,
                    roles: string[],
                ) => {
                    const data = await this.#getSettings(guildId);
                    if (!data) {
                        return status.error(server_not_found);
                    }
                    const find = data.multipliers.find(
                        (c) => c.multiplier === multiplier,
                    );
                    if (!find) {
                        return status.error(
                            `Multiplier (${multiplier}) doesn't exist in ${this.#getServer(
                                guildId,
                            )}`,
                        );
                    }
                    for (const role of roles) {
                        if (find.roles.includes(role)) {
                            find.roles = find.roles.filter((c) => c !== role);
                        } else {
                            find.roles.push(role);
                        }
                    }
                    await save(data);
                    return status.success(
                        `Multiplier (${multiplier}) roles is now updated.`,
                    );
                },
            },

            ignore: {
                /**
                 * Toggle on/off certain channels from being ignored in a certain server. (they will not gain XP)
                 */
                channels: async (guildId: string, channels: string[]) =>
                    this.#handleIgnore(guildId, "channels", channels),

                /**
                 * Toggle on/off certain roles from being ignored in a certain server. (they will not gain XP)
                 */
                roles: async (guildId: string, roles: string[]) =>
                    this.#handleIgnore(guildId, "roles", roles),
                /**
                 * Toggle on/off certain users from being ignored in a certain server. (they will not gain XP)
                 */
                users: async (guildId: string, users: string[]) =>
                    this.#handleIgnore(guildId, "users", users),
            },

            leaderboard: {
                /**
                 * Get the leaderboard for a certain server.
                 */
                get: async <D>(
                    guildId: string,
                    options?: LeaderboardOptions,
                    board?: D,
                ) => {
                    let page = options?.page || 1;
                    let perPage = options?.perPage || null;
                    const sort = options?.sort || "top";
                    const sortBy = options?.sortBy || "level";
                    if (page && !perPage) {
                        perPage = 10;
                    }
                    const data =
                        board ||
                        ((await this.#client.dbs.users
                            .find({ guildId })
                            .lean()
                            .catch(() => [])) as CachedOptions<Users>[]);
                    if (!is.array(data)) {
                        return status.error(
                            `Unable to find anyone on the leaderboard.`,
                        );
                    }
                    const getSorted = () => {
                        if (sort === "top") {
                            return data.sort((a, b) => b[sortBy] - a[sortBy]);
                        }
                        return data.sort((a, b) => a[sortBy] - b[sortBy]);
                    };

                    const fetchedSorted = getSorted();
                    const sorted: LeaderboardUser[] = [];
                    let i = 0;
                    for (const f of fetchedSorted) {
                        i++;
                        sorted.push({
                            position: i,
                            ...f,
                        });
                    }
                    if (perPage) {
                        const pages = chunk(sorted, perPage);
                        if (!pages[page - 1]) {
                            page = 1;
                        }
                        if (!is.array(pages[page - 1])) {
                            return status.error(
                                `Unable to find anyone on the leaderboard.`,
                            );
                        }
                        return {
                            status: true,
                            data: pages[page - 1],
                            query: {
                                page,
                                pages: pages.length,
                                sort,
                                sortBy,
                                perPage,
                            },
                        } as LeaderboardFormattedResponse<LeaderboardUser[]>;
                    }
                    return {
                        status: true,
                        data: sorted,
                        query: {
                            page,
                            pages: chunk(sorted, perPage || 10).length,
                            sort,
                            sortBy,
                            perPage,
                        },
                    } as LeaderboardFormattedResponse<LeaderboardUser[]>;
                },

                /**
                 * Get the formatted leaderboard for a certain server.
                 * This will fetch the users information to have their Discord info in the returned data.
                 */
                formatted: async <D>(
                    guildId: string,
                    options?: LeaderboardOptions,
                    forceStatic?: boolean,
                    board?: D,
                ) => {
                    const DB = await this.servers.leaderboard.get(
                        guildId,
                        options,
                        board,
                    );
                    if (!DB.status) {
                        return DB;
                    }

                    const fetchData = async <D extends LeaderboardUser[]>(
                        dbs: D,
                    ) => {
                        const users: LeaderboardFormatted[] = [];
                        for await (const db of dbs) {
                            const user = await discord.user(
                                this.#client.client,
                                db.userId,
                                { fetch: true, mock: true },
                            );
                            users.push({
                                ...db,
                                user: {
                                    username: user?.username ?? "unknown_user",
                                    displayName:
                                        user?.displayName ?? "Unknown User",
                                    globalName: user?.globalName ?? null,
                                    discriminator: user?.discriminator ?? "0",
                                    tag: user?.tag ?? "Unknown User#0",
                                    id: db.userId,
                                    avatar: getUserAvatar(user),
                                    accentColor: user?.hexAccentColor || null,
                                    banner: user?.banner
                                        ? user.bannerURL()
                                        : null,
                                    bot: user?.bot || false,
                                    createdAt: new Date(
                                        parseInt(
                                            `${
                                                snowflakes.get(db.userId)
                                                    .timestamp
                                            }`,
                                        ),
                                    ),
                                },
                            });
                        }
                        return users;
                    };
                    if (DB.query.perPage) {
                        const pages = chunk(DB.data, DB.query.perPage);
                        if (!pages[DB.query.page - 1]) {
                            DB.query.page = 1;
                        }
                        if (!is.array(pages[DB.query.page - 1])) {
                            return status.error(
                                `Unable to find anyone on the leaderboard.`,
                            );
                        }
                        return {
                            status: true,
                            data: await fetchData(pages[DB.query.page - 1]),
                            query: DB.query,
                        } as LeaderboardFormattedResponse<
                            LeaderboardFormatted[]
                        >;
                    }
                    return {
                        status: true,
                        data: await fetchData(DB.data),
                        query: DB.query,
                    } as LeaderboardFormattedResponse<LeaderboardFormatted[]>;
                },

                /**
                 * Set the leaderboard background (or color) for a certain server
                 * NOTE: Only available to 'canvacord' leaderboard type
                 */
                setBackground: async (
                    guildId: string,
                    options: { url?: string | null; color?: string | null },
                ) => {
                    const data = await this.#getSettings(guildId);
                    if (!data) {
                        return status.error(server_not_found);
                    }
                    const changed = [];
                    if (options) {
                        if (is.string(options.url, false)) {
                            if (!options.url.match(/http(s):\/\//gi)) {
                                options.url = "";
                            }
                            data.background.url = options.url || "";
                            changed.push(
                                `Background URL: ${
                                    data.background.url || "Reset"
                                }`,
                            );
                        }
                        if (is.string(options.color, false)) {
                            data.background.color = options.color || "";
                            changed.push(
                                `Background Color: ${
                                    data.background.color || "Reset"
                                }`,
                            );
                        }
                    }
                    if (!is.array(changed)) {
                        return status.error(`Nothing needed to be updated.`);
                    }
                    await save(data);
                    return status.success(
                        `I've updated the Leaderboard background info:\n${changed.join(
                            "\n",
                        )}`,
                    );
                },
            },

            /**
             * Delete all data belonging to a certain server (main data)
             */
            delete: async (guildId: string) => {
                const o = { guildId };
                const removed: {
                    data: CachedOptions<Settings> | null;
                    weekly: CachedOptions<Weekly>[];
                    users: CachedOptions<Users>[];
                } = {
                    data: null,
                    weekly: [],
                    users: [],
                };
                const [data, weekly, users] = await Promise.all([
                    this.#client.dbs.settings
                        .findOne(o)
                        .catch(() => null) as Promise<CachedOptions<Settings>>,
                    this.#client.dbs.weekly.find(o).catch(() => []) as Promise<
                        CachedOptions<Weekly>[]
                    >,
                    this.#client.dbs.users.find(o).catch(() => []) as Promise<
                        CachedOptions<Users>[]
                    >,
                ]);
                if (data) {
                    removed.data = data;
                }
                if (is.array(weekly)) {
                    removed.weekly = weekly;
                }
                if (is.array(users)) {
                    removed.users = users;
                }
                await Promise.all([
                    // @ts-ignore
                    data?.deleteOne()?.catch(() => null),
                    this.#client.dbs.users
                        .deleteMany({ guildId })
                        .catch(() => null),
                    this.#client.dbs.weekly
                        .deleteMany({ guildId })
                        .catch(() => null),
                ]);
                return {
                    status: true,
                    message: `Deleted (${guildId}) server's data.`,
                    data: removed,
                };
            },

            users: {
                get: async (guildId: string) => {
                    const data = await this.#getSettings(guildId);
                    if (!data) {
                        return status.error(server_not_found);
                    }
                    const users = await this.#client.dbs.users
                        .find({
                            guildId,
                        })
                        .lean()
                        .catch(() => []);
                    if (!is.array(users)) {
                        return status.error(
                            `There is 0 users on the leaderboard for ${this.#getServer(
                                guildId,
                            )}`,
                        );
                    }
                    return status.data(users);
                },

                count: async (guildId: string) => {
                    const data = await this.#getSettings(guildId);
                    if (!data) {
                        return status.error(server_not_found);
                    }
                    const count = await this.#client.dbs.users
                        .countDocuments({ guildId })
                        .catch(() => 0);
                    if (!is.number(count)) {
                        return status.error(
                            `No one has a leveling profile for ${this.#getServer(
                                guildId,
                            )}`,
                        );
                    }
                    return status.data({ count });
                },

                reset: async (guildId: string) => {
                    const data = await this.#getSettings(guildId);
                    if (!data) {
                        return status.error(server_not_found);
                    }
                    const count = await this.servers.users.count(guildId);
                    if (!count.status) {
                        return count;
                    }
                    const users = await this.servers.users.get(guildId);
                    if (!users.status) {
                        return users;
                    }
                    const deleted = await this.#client.dbs.users
                        .deleteMany({
                            guildId,
                        })
                        .catch(() => null);
                    if (!deleted || !is.number(deleted.deletedCount)) {
                        return status.error(
                            `Unable to delete any leveling profiles in ${this.#getServer(
                                guildId,
                            )}`,
                        );
                    }
                    return status.data({
                        count: deleted.deletedCount,
                        users: users.data,
                    });
                },

                left: async (guildId: string, dry = true) => {
                    const guild = this.#client.client.guilds.resolve(guildId);
                    if (!guild || !guild.available) {
                        return status.error(
                            `Can't find server (${guildId}) or it's not available.`,
                        );
                    }
                    if (!hasBit(getClientIntents(this.#client.client), 2)) {
                        return status.error(
                            `The bot isn't using the "Server Members" intent, I cannot fetch the members list.`,
                        );
                    }
                    const members = await guild.members
                        .fetch()
                        .catch(() => null);
                    if (!members?.size) {
                        return status.error(
                            `Unable to fetch the members for the server.`,
                        );
                    }
                    const dbs = await this.#client.dbs.users
                        .find({
                            guildId,
                        })
                        .catch(() => []);
                    const users = dbs.filter((c) => !members.has(c.userId));
                    if (!users.length) {
                        return status.error(`No one needed to be removed.`);
                    }
                    if (dry === true) {
                        return status.data({
                            count: users.length,
                            deleted: false,
                        });
                    }
                    const r = await this.#client.dbs.users
                        .deleteMany({
                            _id: {
                                $in: users.map((c) => c._id),
                            },
                        })
                        .catch(() => null);
                    if (!r?.deletedCount) {
                        return status.error(`Nothing needed to be removed.`);
                    }
                    return status.data({
                        count: r.deletedCount,
                        users,
                        deleted: true,
                    });
                },
            },
        };
    }

    public get users() {
        return {
            stats: {
                /**
                 * Increments the stats count for the type provided.
                 * - Supports custom stats counters (default: 'messages', 'voice')
                 * - 'voice' is total minutes spent in a voice channel.
                 */
                inc: async (
                    userId: string,
                    guildId: string,
                    type: string,
                    count = 1,
                ) => {
                    const data = await this.#getUser(userId, guildId);
                    if (!data) {
                        return status.error(message);
                    }
                    // @ts-ignore
                    data.stats = incUserStat(data, type, count);
                    await save(data);
                    return status.success(
                        `I've added (${count}) to (${type}) stats for ${this.#displayUser(
                            userId,
                        )} user on ${this.#getServer(guildId)}`,
                    );
                },
                /**
                 * Decrements the stats count for the type provided.
                 * - Supports custom stats counters (default: 'messages', 'voice')
                 * - 'voice' is total minutes spent in a voice channel.
                 */
                dec: async (
                    userId: string,
                    guildId: string,
                    type: string,
                    count = 1,
                ) => {
                    const data = await this.#getUser(userId, guildId);
                    if (!data) {
                        return status.error(message);
                    }
                    // @ts-ignore
                    data.stats = incUserStat(data, type, count);
                    await save(data);
                    return status.success(
                        `I've added (${count}) to (${type}) stats for ${this.#displayUser(
                            userId,
                        )} user on ${this.#getServer(guildId)}`,
                    );
                },
            },

            /**
             * Get a user's rank position for a server.
             */
            position: async (
                userId: string,
                guildId: string,
                sort?: "ascending" | "descending",
            ) => {
                if (!sort) {
                    sort = "descending";
                }
                const lb = await this.#client.dbs.users
                    .find({ guildId })
                    .sort([["xp", sort]])
                    .exec();
                return lb.findIndex((c) => c.userId === userId) + 1;
            },

            /**
             * Get a user's profile data for a server.
             */
            get: async (userId: string, guildId: string) => {
                const data = await this.#getUser(userId, guildId);
                if (!data) {
                    return status.error(message);
                }
                return status.data(data.toJSON());
            },

            /**
             * Get all profile data for a server
             */
            fetchAll: async (userId: string) => {
                const data = await this.#client.dbs.users
                    .find({ userId })
                    .lean()
                    .catch(() => []);
                if (!is.array(data)) {
                    return status.error(
                        `Unable to find ${this.#displayUser(
                            userId,
                        )} user in any server.`,
                    );
                }
                return status.data(data);
            },

            /**
             * Toggle certain features for a user on a server.
             */
            toggle: async (
                userId: string,
                guildId: string,
                type: UserToggles,
            ) => {
                const data = await this.#getUser(userId, guildId);
                if (!data) {
                    return status.error(message);
                }
                data.toggles[type] = tog(data.toggles[type]);
                await save(data);
                return status.success(
                    `I've turned ${
                        data.toggles[type] ? "on" : "off"
                    } ${type} for ${this.#displayUser(
                        userId,
                    )}'s profile in ${this.#getServer(guildId)}`,
                );
            },

            /**
             * [WARNING]: This should only be used for internal use, as any XP added will trigger a "levelup" event
             */
            appendXP: async (
                userId: string,
                guildId: string,
                xp: number,
                voiceMinutes = 0,
                /** Do not use this option unless you don't want the levels to be announced for the XP added. */
                handledInternally = false,
            ) => {
                const data = await this.#getUser(userId, guildId);
                if (!data) {
                    return null;
                }
                if (is.number(voiceMinutes)) {
                    // @ts-ignore
                    data.stats = incUserStat(data, "voice", voiceMinutes);
                }
                data.xp += parseInt(String(xp), 10);
                data.level = Math.floor(0.1 * Math.sqrt(data.xp));
                await save(data);
                const isLevelup =
                    Math.floor(0.1 * Math.sqrt((data.xp -= xp))) < data.level;
                if (!handledInternally) {
                    const guild = this.#client.client.guilds.resolve(guildId);
                    if (guild && guild.available) {
                        const member = await discord.member(
                            guild,
                            userId,
                            true,
                        );
                        if (member) {
                            // @ts-ignore
                            this.#client.handleLevelups(
                                member,
                                null,
                                xp,
                                null,
                                undefined,
                                isLevelup,
                            );
                        }
                    }
                }
                return isLevelup;
            },

            /**
             * Set a level for a user on a certain server.
             */
            setLevel: async (
                userId: string,
                guildId: string,
                level: number,
            ) => {
                const data = await this.#getUser(userId, guildId);
                if (!data) {
                    return status.error(message);
                }
                data.level = level;
                data.xp = xpFor(level) + 1;
                await save(data);
                return status.success(
                    `${this.#displayUser(
                        userId,
                    )}'s level is now set to: ${level}`,
                );
            },

            /**
             * Set/Reset a background for a user on a certain server.
             */
            setBackground: async (
                userId: string,
                guildId: string,
                background?: string,
            ) => {
                const data = await this.#getUser(userId, guildId);
                if (!data) {
                    return status.error(message);
                }
                if (background) {
                    if (
                        !background.match(/http(s)?:\/\//gi) ||
                        !background.match(/.(png|jpg|jpeg|gif|webp)/gi)
                    ) {
                        return status.error(
                            `The background url provided isn't a valid image link.`,
                        );
                    }
                    data.background = background;
                    await save(data);
                    return status.success(
                        `Set ${this.#displayUser(
                            userId,
                        )}'s background url in ${this.#getServer(
                            guildId,
                        )} to: ${background}`,
                    );
                } else {
                    data.background = "";
                    await save(data);
                    return status.success(
                        `Reset ${this.#displayUser(
                            userId,
                        )}'s background url in ${this.#getServer(guildId)}`,
                    );
                }
            },

            /**
             * Set/Reset color(s) for a user on a certain server.
             */
            setColor: async (
                userId: string,
                guildId: string,
                type: ColorType,
                color?: string | number,
            ) => {
                if (
                    is.string(color, false) &&
                    ["null", "undefined", null, undefined, "0", 0].includes(
                        color.toLowerCase(),
                    )
                ) {
                    color = "";
                }
                if (!is.string(type) || !colors.valid(type.toLowerCase())) {
                    return status.error(
                        `Color type (${type}) isn't valid, here are the valid options: ${colors.types.join(
                            ", ",
                        )}`,
                    );
                }
                const data = await this.#getUser(userId, guildId);
                if (!data) {
                    return status.error(message);
                }

                if (is.number(color)) {
                    color = `#${color.toString(16)}`;
                }
                const find = data.colors.find(
                    (c) => c.type === type.toLowerCase(),
                );
                if (is.string(color)) {
                    if (!color.startsWith("#")) {
                        return status.error(
                            `The color needs to be a hex color! (ex: #fffff)`,
                        );
                    }
                    if (find) {
                        find.color = color;
                    } else {
                        data.colors.push({
                            type: type.toLowerCase() as ColorType,
                            color,
                        });
                    }
                    await save(data);
                    return status.success(
                        `Set ${this.#displayUser(
                            userId,
                        )}'s (${type.toLowerCase()}) color profile to ${color} in ${this.#getServer(
                            guildId,
                        )}`,
                    );
                } else {
                    data.colors = data.colors.filter(
                        (c) => c.type !== type.toLowerCase(),
                    );
                    await save(data);
                    return status.success(
                        `Reset ${this.#displayUser(
                            userId,
                        )}'s (${type.toLowerCase()}) color profile in ${this.#getServer(
                            guildId,
                        )}`,
                    );
                }
            },

            /**
             * Set XP for a user on a certain server.
             */
            setXP: async (userId: string, guildId: string, xp: number) => {
                const data = await this.#getUser(userId, guildId);
                if (!data) {
                    return status.error(message);
                }
                data.xp = xp;
                data.level = Math.floor(0.1 * Math.sqrt(data.xp));
                await save(data);
                return status.success(
                    `${this.#displayUser(userId)}'s XP is now set to: ${
                        data.xp
                    } and level ${data.level}`,
                );
            },

            /**
             * Create a user's profile in a certain server.
             * NOTE: The package will automatically create it once they send a message or earn xp
             */
            create: async (userId: string, guildId: string) => {
                const data = await this.#getUser(userId, guildId);
                if (!data) {
                    return status.error(message);
                }
                return status.data(data.toJSON());
            },

            delete: {
                /**
                 * Delete all data for a user.
                 */
                all: async (userId: string) => {
                    const data = await this.#client.dbs.users
                        .find({ userId })
                        .catch(() => []);
                    if (!is.array(data)) {
                        return status.error(
                            `There is no data to delete for ${this.#displayUser(
                                userId,
                            )}`,
                        );
                    }
                    await this.#client.dbs.users
                        .deleteMany({ userId })
                        .catch(() => {});
                    return {
                        status: true,
                        data,
                        message: `Deleted ${this.#displayUser(
                            userId,
                        )}'s profiles in ${data.length} servers`,
                    };
                },

                /**
                 * Delete a user's data for a certain server.
                 */
                guild: async (userId: string, guildId: string) => {
                    const data = await this.#getUser(userId, guildId);
                    if (!data) {
                        return status.error(
                            `There is no data to delete for ${this.#displayUser(
                                userId,
                            )}`,
                        );
                    }
                    await data.deleteOne().catch(() => null);
                    return {
                        status: true,
                        message: `Deleted ${this.#displayUser(
                            userId,
                        )}'s profile in ${this.#getServer(guildId)}`,
                        data,
                    };
                },
            },

            /**
             * Mass delete certain users data from the system
             * NOTE: Deletes ALL the users profiles for ALL servers
             */
            purge: async (dry = true, users: string[]) => {
                const data = await this.#client.dbs.users
                    .find(
                        is.array(users)
                            ? {
                                  userId: {
                                      $in: users,
                                  },
                              }
                            : {},
                    )
                    .lean()
                    .catch(() => []);
                if (!is.array(data)) {
                    return status.error(`There is no users stored.`);
                }
                if (dry === true) {
                    return {
                        status: true,
                        message: `Found (${data.length}) users matching the query.`,
                        data,
                    };
                }
                if (is.array(users)) {
                    await this.#client.dbs.users
                        .deleteMany({
                            userId: {
                                $in: users,
                            },
                        })
                        .catch(() => null);
                } else {
                    await this.#client.dbs.users
                        .deleteMany({
                            _id: {
                                $in: data.map((c) => c._id),
                            },
                        })
                        .catch(() => null);
                }
                return {
                    status: true,
                    message: `Deleted (${data.length}) user profiles.`,
                    data,
                };
            },
        };
    }

    public get weekly() {
        return {
            /**
             * Get a server's weekly data (or a certain weeklyId's info)
             */
            get: async (guildId: string, weeklyId?: string) => {
                // @ts-ignore
                const data = await this.#client.weekly.get(guildId, weeklyId);
                if (!data) {
                    return status.error(
                        `Unable to find any weekly data for ${this.#getServer(
                            guildId,
                        )} ${weeklyId ? ` (${weeklyId})` : ""}`,
                    );
                }
                return status.data(data.toJSON());
            },

            /**
             * Get all of the weekly data for a server.
             */
            fetchAll: async (guildId: string) => {
                const data = await this.#client.dbs.weekly
                    .find({ guildId })
                    .lean()
                    .catch(() => []);
                if (!is.array(data)) {
                    return status.error(
                        `Unable to find any weekly data for ${this.#getServer(
                            guildId,
                        )}`,
                    );
                }
                return status.data(data);
            },

            /**
             * Get the server's weekly leaderboard data.
             */
            leaderboard: async (
                guildId: string,
                weeklyId?: string,
                options?: LeaderboardOptions,
            ) => {
                if (!weeklyId) {
                    // @ts-ignore
                    const find = await this.#client.weekly.get(guildId);
                    if (find) {
                        weeklyId = find.id;
                    }
                }
                if (!weeklyId) {
                    return status.error(`You failed to provide a weeklyId`);
                }
                const data = await this.weekly.get(guildId, weeklyId);
                if (!data.status) {
                    return data;
                }
                if (!is.array(data.data.users)) {
                    return status.error(
                        `There is no one on the weekly leaderboard for ${this.#getServer(
                            guildId,
                        )}`,
                    );
                }
                return await this.servers.leaderboard.formatted(
                    guildId,
                    options,
                    true,
                    data.data.users,
                );
            },
        };
    }

    /**
     * Get the rank card for the user for a certain server.
     * Returns an image buffer
     */
    public async getRankCard(
        userId: string,
        guildId: string,
        type: CanvasRankProfileTypes = "arcane",
    ): CanvasResponse {
        if (!RankProfiles[type]) {
            return status.error(
                `Canvas profile (${type}) isn't a valid option.`,
            );
        }
        const db = await this.#getUser(userId, guildId);
        if (!db) {
            return status.error(server_not_found);
        }
        const user = await discord.user(this.#client.client, userId, {
            fetch: true,
            mock: false,
        });
        if (!user) {
            return status.error(
                `Unable to fetch ${this.#displayUser(userId)}'s Discord info`,
            );
        }
        let memberStatus;
        if (
            hasBit(
                getClientIntents(this.#client.client),
                256 /* Guild Presences */,
            )
        ) {
            const guild = this.#client.client.guilds.resolve(guildId);
            if (guild && guild.available) {
                const member = await discord.member(guild, userId, true, true);
                if (member) {
                    if (member.presence?.status) {
                        memberStatus = member.presence.status.replace(
                            /offline/gi,
                            "invisible",
                        ) as Exclude<MemberPresenceStatus, "offline">;
                    }
                }
            }
        }
        try {
            return await RankProfiles[type](
                user,
                // @ts-ignore
                db,
                await this.users.position(userId, guildId),
                memberStatus,
            );
        } catch (err) {
            console.trace(err);
            return status.error(
                `Error while trying to generate the user's rank card.`,
            );
        }
    }

    /**
     * Get a server's leaderboard
     * Returns an image buffer
     */
    public async getLeaderboard(
        guildId: string,
        options?: Omit<
            LeaderboardCanvasOptions,
            "background" | "backgroundColor"
        >,
        type: CanvasLeaderboardTypes = "canvacord",
        isWeekly = false,
        details?:
            | {
                  title?: string;
                  subtitle?: string;
                  image?: string;
                  backgroundUrl?: string;
                  backgroundColor?: string;
              }
            | null
            | undefined,
        weeklyId?: string,
    ): CanvasResponseWithQuery {
        if (!Leaderboards[type]) {
            return status.error(
                `Canvas profile (${type}) isn't a valid option.`,
            );
        }
        if (options && is.number(options.perPage)) {
            if (![0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].includes(options.perPage)) {
                status.error(
                    `The 'options.perPage' value is invalid, you can only use perPage 1 through 10`,
                );
            }
        }
        const db = await this.servers.get(guildId);
        if (!db.status) {
            return db;
        }
        const guild = this.#client.client.guilds.resolve(guildId);
        if (!guild || !guild.available) {
            return status.error(
                `Unable to fetch (${guildId}) server's information.`,
            );
        }
        let lb;
        if (isWeekly) {
            lb = await this.weekly.leaderboard(guildId, weeklyId);
        } else {
            lb = await this.servers.leaderboard.formatted(
                guildId,
                options,
                true,
            );
        }
        if (!lb.status) {
            return lb;
        }
        return await Leaderboards[type](
            lb.data.map((c) => ({
                avatar: c.user.avatar,
                displayName: c.user.displayName,
                username: c.user.username,
                level: c.level,
                xp: c.xp,
                rank: c.position,
            })),
            lb.query,
            {
                title: details?.title || guild.name,
                image:
                    details?.image ||
                    getGuildIcon(guild) ||
                    "https://cdn.discordapp.com/emojis/858809264893460511.png",
                subtitle:
                    details?.subtitle || isWeekly
                        ? `Weekly Leaderboard!`
                        : `${guild.memberCount.toLocaleString()} Members`,
            },
            {
                backgroundColor:
                    details?.backgroundColor || db.data.background.color || "",
                background:
                    details?.backgroundUrl ||
                    db.data.background.url ||
                    "https://i.imgur.com/Y5m4ntt.jpeg",
            },
        );
    }
}
