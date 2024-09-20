import { REST } from "@discordjs/rest";
import { CacheOptions, Caching } from "@elara-services/cache";
import {
    discord,
    get,
    getClientIdFromToken,
    getPackageStart,
    is,
    log,
    make,
    sleep,
    status,
} from "@elara-services/utils";
import {
    Collection,
    Invite as DInvite,
    Guild,
    RESTGetAPIGuildInvitesResult,
    Routes,
    User,
    type Client,
} from "discord.js";
import pack from "../package.json";
import {
    FetchOnJoinResult,
    FetchedMemberInvitesResponse,
    Invite,
    MakeRequestData,
    Query,
} from "./interfaces";

export type * from "./interfaces";

export class InviteClient {
    #started = false;
    public data = new Caching();
    public rest = new REST();
    public clientId: string;
    public constructor(
        public client: Client<true>,
        options: CacheOptions = { type: "memory" },
        public debug: boolean = false
    ) {
        this.clientId = getClientIdFromToken(client.token);
        this.rest.setToken(client.token);
        if (options) {
            if (options.type === "redis") {
                this.data = this.data.setType("redis", options.redis);
            }
        }
        if (!this.#started) {
            if (debug) {
                this.data.setDebug(debug);
            }
            this.#start();
        }
    }

    public setDebug(bool: boolean) {
        this.debug = bool;
        this.data.setDebug(bool);
        return this;
    }

    #log(...args: unknown[]) {
        if (!this.debug) {
            return null;
        }
        log(`${getPackageStart(pack)}: [DEBUG]: `, ...args);
        return null;
    }

    #id(guildId: string) {
        return `${this.clientId}_${guildId}`;
    }

    async #getInvites(guildId: string) {
        return (
            (await this.data.handler.get<Invite[], "invites">(
                this.#id(guildId),
                "invites",
                true
            )) || []
        );
    }

    public get search() {
        return {
            members: async (guild: Guild, users: string[], format = true) => {
                return await this.#newMemberSearch(
                    guild,
                    users,
                    format,
                    format
                );
            },
            member: async (guild: Guild, user: string, format = true) => {
                const r = await this.#newMemberSearch(
                    guild,
                    [user],
                    format,
                    format
                );
                if (!r.status) {
                    return r;
                }
                if (!r.data.members.length) {
                    return status.error(
                        `Unable to find (${user})'s invite info.`
                    );
                }
                return status.data(r.data.members[0]);
            },

            bot: async (guild: Guild, user: User | string) => {
                const id = user instanceof User ? user.id : user;
                const bot =
                    user instanceof User
                        ? user
                        : await discord.user(this.client, id, {
                              fetch: true,
                              mock: true,
                              force: true,
                          });
                if (!bot) {
                    return status.error(`Unable to find any info for ${id}`);
                }
                if (!bot.bot) {
                    return status.error(`ID ${id} isn't a bot account.`);
                }
                const data = await guild
                    .fetchAuditLogs({
                        type: 28,
                        limit: 100,
                    })
                    .catch(() => {});
                if (!data || !data.entries?.size) {
                    return status.error(`Unable to find any info for ${id}`);
                }
                const f = data.entries.find(
                    (c) => c.target?.id === id && c.executor
                );
                if (!f || !f.executor) {
                    return status.error(`Unable to find any info for ${id}`);
                }
                return status.data({
                    bot,
                    uses: "♾",
                    code: `OAuth2`,
                    inviter: f.executor,
                });
            },
        };
    }

    public async getOnJoin(
        guild: Guild,
        user?: User | string
    ): Promise<FetchOnJoinResult> {
        const u = user
            ? user instanceof User
                ? user
                : await discord.user(this.client, user, {
                      fetch: true,
                      mock: false,
                  })
            : null;
        const uId = u?.id;
        if (u && u.bot) {
            const d = await this.search.bot(guild, u);
            if (d.status) {
                return {
                    code: d.data.code,
                    inviter: d.data.inviter,
                    uses: d.data.uses,
                };
            }
            return null;
        }
        const backup = await this.getInviteUsed(guild);
        if (uId && user) {
            const r = await this.search.member(guild, uId, true);
            if (r.status && r.data.source_invite_code) {
                return {
                    code: r.data.source_invite_code,
                    inviter: r.data.inviter,
                    uses: r.data.uses || 1,
                };
            }
        }
        if (!backup) {
            return null;
        }
        return {
            code: backup.code,
            uses: backup.uses,
            inviter: is.string(backup.inviter)
                ? await discord.user(this.client, backup.inviter, {
                      fetch: true,
                      mock: true,
                  })
                : backup.inviter,
        };
    }

    public async getInviteUsed(guild: Guild) {
        if (!guild?.members?.me?.permissions?.has?.(48n)) {
            return null;
        }
        const f = (i: any) =>
            `${i.code}|${i.uses ? i.uses : "♾"}|${i.inviter?.id ?? "None"}`;
        const invites = await guild.invites.fetch().catch(this.#log);
        if (!invites) {
            return null;
        }
        const CachedInvites = (await this.#getInvites(guild.id)).map(f);
        const currentInvites = invites.map(f);
        if (!CachedInvites?.length) {
            await this.#recacheInvites(guild.id, invites);
            return null;
        }
        if (CachedInvites.join(" ") === currentInvites.join(" ")) {
            if (guild.features.includes("VANITY_URL") && guild.vanityURLCode) {
                const owner = await discord.user(guild.client, guild.ownerId, {
                    fetch: true,
                    mock: true,
                });
                return {
                    code: guild.vanityURLCode,
                    uses: `♾`,
                    inviter: owner ?? "[UNKNOWN_USER]",
                };
            }
            if (invites.size) {
                await this.#recacheInvites(guild.id, invites);
            }
            return null;
        } else {
            const used = this.#compare(currentInvites, CachedInvites);
            if (!is.string(used)) {
                await this.#recacheInvites(guild.id, invites);
                return null;
            }
            const [code, uses, inviter] = used.split("|");
            await this.#recacheInvites(guild.id, invites);
            return {
                code,
                uses: uses === "Infinite" ? "♾" : uses,
                inviter: await discord.user(guild.client, inviter, {
                    fetch: true,
                    mock: true,
                }),
            };
        }
    }

    #compare(c: string[], s: string[]) {
        for (let i = 0; i < c.length; i++) {
            if (c[i] !== s[i]) {
                return c[i];
            }
        }
        return "";
    }

    async #start() {
        this.#started = true;
        this.client.on("inviteCreate", (i) => this.#invites(i, false));
        this.client.on("inviteDelete", (i) => this.#invites(i, true));
        this.client.on("guildCreate", this.#onGuild);
        this.client.on("guildDelete", async (g) => {
            if (g && g.available) {
                await this.data.handler.remove(this.#id(g.id), "invites");
            }
        });
    }

    async #invites(i: DInvite, remove = false) {
        if (!i || !i.guild) {
            return;
        }
        let r = await this.#getInvites(i.guild.id);
        if (!r) {
            await this.recache(i.guild.id);
            return;
        }
        if (remove) {
            r = r.filter((c) => c.code !== i.code);
            return await this.data.handler.set(
                this.#id(i.guild.id),
                r,
                "invites",
                0
            );
        }
        r.push({
            channel: i.channelId
                ? {
                      name: i.channel?.name ?? null,
                      id: i.channelId,
                  }
                : null,
            inviter: i.inviter
                ? {
                      username: i.inviter.username,
                      id: i.inviter.id,
                      avatar: i.inviter.displayAvatarURL(),
                      bot: i.inviter.bot,
                      discriminator: i.inviter.discriminator,
                  }
                : i.inviterId
                ? {
                      avatar: make.image.users.avatar(i.inviterId, undefined),
                      id: i.inviterId,
                      bot: false,
                      username: "Unknown User",
                      discriminator: "0000",
                  }
                : null,
            code: i.code,
            temporary: i.temporary || false,
            uses: i.uses || 0,
        });
        return await this.data.handler.set(
            this.#id(i.guild.id),
            r,
            "invites",
            0
        );
    }

    async #onGuild(g: Guild) {
        if (
            !g ||
            !g.available ||
            !g.members ||
            !g.members.me ||
            !g.members.me.permissions
        ) {
            return;
        }
        if (g.members.me.permissions.has(32n)) {
            await this.recache(g.id);
        }
    }

    public async recache(guildId: string) {
        await this.data.handler.remove(this.#id(guildId), "invites");
        const r = (await this.rest
            .get(Routes.guildInvites(guildId))
            .catch(this.#log)) as RESTGetAPIGuildInvitesResult | null;
        if (r && is.array(r)) {
            await this.data.handler.set(
                this.#id(guildId),
                r.map((c) => ({
                    temporary: c.temporary,
                    code: c.code,
                    inviter: c.inviter
                        ? {
                              username: c.inviter.username,
                              id: c.inviter.id,
                              bot: c.inviter.bot || false,
                              discriminator: c.inviter.discriminator,
                              avatar: c.inviter.avatar
                                  ? make.image.users.avatar(
                                        c.inviter.id,
                                        c.inviter.avatar
                                    )
                                  : null,
                          }
                        : null,
                    uses: c.uses || "♾️",
                    channel: c.channel
                        ? {
                              name: c.channel.name,
                              id: c.channel.id,
                          }
                        : null,
                })),
                "invites",
                0
            );
        }
    }

    async #recacheInvites(
        guildId: string,
        invites: Collection<string, DInvite>
    ) {
        await this.data.handler.set(
            this.#id(guildId),
            invites.map((c) => ({
                temporary: c.temporary || false,
                code: c.code,
                inviter: c.inviter
                    ? {
                          username: c.inviter.username,
                          id: c.inviter.id,
                          bot: c.inviter.bot || false,
                          discriminator: c.inviter.discriminator,
                          avatar: c.inviter.avatar
                              ? make.image.users.avatar(
                                    c.inviter.id,
                                    c.inviter.avatar
                                )
                              : null,
                      }
                    : null,
                uses: c.uses || "♾️",
                channel: c.channel
                    ? {
                          name: c.channel.name,
                          id: c.channel.id,
                      }
                    : null,
            })),
            "invites",
            0
        );
    }

    async #newMemberSearch(
        guild: Guild,
        users: string[],
        fetchInviters?: boolean,
        fetchUses?: boolean
    ): Promise<MakeRequestData> {
        return await this.custom(
            guild,
            {
                limit: users.length,
                and_query: {
                    user_id: {
                        or_query: users,
                    },
                },
            },
            fetchUses,
            fetchInviters
        );
    }

    /**
     * NOTE This will take a few seconds to minutes to return ALL of the user generated invites.
     */
    public async fetchAll(
        guild: Guild,
        fetchUses = true,
        fetchInviters = false,
        filter?: (m: FetchedMemberInvitesResponse["members"][0]) => boolean
    ): Promise<
        | {
              status: true;
              data: FetchedMemberInvitesResponse["members"];
          }
        | { status: false; message: string }
    > {
        return new Promise(async (r) => {
            const create = async (
                member?: FetchedMemberInvitesResponse["members"][0]
            ) =>
                await this.custom(
                    guild,
                    {
                        limit: 1000,
                        and_query: { join_source_type: { or_query: [5] } },
                        after: member
                            ? {
                                  guild_joined_at: new Date(
                                      member.member.joined_at as string
                                  ).getTime(),
                                  user_id: member.member.user.id,
                              }
                            : undefined,
                    },
                    fetchUses,
                    fetchInviters,
                    filter
                );
            const members: FetchedMemberInvitesResponse["members"] = [];
            const first = await create();
            if (!first.status) {
                return r(status.error(first.message));
            }
            members.push(...first.data.members);
            let next: FetchedMemberInvitesResponse["members"][0] | undefined =
                first.data.members[first.data.members.length - 1];
            const getNext = (r: FetchedMemberInvitesResponse) => {
                next = r.members[r.members.length - 1];
            };
            let i = 0;
            while (next) {
                const c = await create(next);
                if (c.status) {
                    getNext(c.data);
                    members.push(...c.data.members);
                    await sleep(get.secs(2));
                } else {
                    next = undefined;
                    break;
                }
                i++;
            }
            return r(status.data([...new Set(members).values()]));
        });
    }

    public formatAll(members: FetchedMemberInvitesResponse["members"]) {
        const inviters = new Collection<
            string,
            FetchedMemberInvitesResponse["members"]
        >();
        for (const member of members) {
            if (!member.inviter_id) {
                continue;
            }
            if (inviters.has(member.inviter_id)) {
                inviters.set(member.inviter_id, [
                    ...(inviters.get(member.inviter_id) || []),
                    member,
                ]);
            } else {
                inviters.set(member.inviter_id, [member]);
            }
        }
        return inviters;
    }

    public async custom(
        guild: Guild,
        query: Query,
        fetchUses = true,
        fetchInviters = true,
        filter?: (m: FetchedMemberInvitesResponse["members"][0]) => boolean
    ): Promise<MakeRequestData> {
        return new Promise(async (r) => {
            if (!guild.features.includes("COMMUNITY")) {
                return r(
                    status.error(
                        `Server ${guild.name} (${guild.id}) doesn't have "COMMUNITY" enabled so this cannot be used.`
                    )
                );
            }
            let data: FetchedMemberInvitesResponse | Error = new Error(
                `Unable to fetch the members invites.`
            );
            const fetch = async () => {
                data = (await this.rest
                    .post(`/guilds/${guild.id}/members-search`, { body: query })
                    .catch((e: Error) => {
                        this.#log(e);
                        return e;
                    })) as FetchedMemberInvitesResponse | Error;
            };
            await fetch();
            if ("retry_after" in data) {
                await sleep((data.retry_after as number) * 1000);
                await fetch();
            }
            if (data instanceof Error) {
                return r(
                    status.error(
                        data?.message || "Unknown Issue while fetching it."
                    )
                );
            }
            // @ts-ignore
            if (!is.array(data.members)) {
                return r(
                    status.error(`No 'members' returned for the request.`)
                );
            }
            // @ts-ignore
            data.members = data.members
                .filter((c: any) => {
                    if (query.and_query.join_source_type?.or_query?.length) {
                        if (
                            !query.and_query.join_source_type.or_query.includes(
                                c.join_source_type
                            )
                        ) {
                            return false;
                        }
                    }
                    if (filter) {
                        return filter(c);
                    }
                    return true;
                })
                .map((c: FetchedMemberInvitesResponse["members"][0]) => {
                    const types = {
                        1: "bot",
                        2: "integration",
                        3: "server_discovery",
                        5: "normal",
                        6: "vanity",
                    };
                    // @ts-ignore
                    c.joinType =
                        types[c.join_source_type as keyof typeof types] ||
                        "unknown";
                    return c;
                });
            if (fetchUses === true && guild.members.me?.permissions.has(32n)) {
                const invs = await guild.invites
                    .fetch({ cache: false })
                    .catch(this.#log);
                if (invs?.size) {
                    // @ts-ignore
                    data.members = data.members.map((c) => {
                        if (!c) {
                            return c;
                        }
                        if ("source_invite_code" in c && c.source_invite_code) {
                            const d = invs.find(
                                (i) => i.code === c.source_invite_code
                            );
                            c.uses = d?.uses || 0;
                            c.notFound = d ? false : true;
                        } else {
                            c.uses = 0;
                            c.notFound = false;
                        }
                        return c;
                    });
                } else {
                    // @ts-ignore
                    data.members = data.members.map((c) => {
                        c.uses = 0;
                        c.notFound = true;
                        return c;
                    });
                }
            } else {
                // @ts-ignore
                data.members = data.members.map((c) => {
                    c.uses = 0;
                    c.notFound = false;
                    return c;
                });
            }
            if (fetchInviters === true) {
                // @ts-ignore
                data.members = await Promise.all(
                    // @ts-ignore
                    data.members.map(async (c) => {
                        if (c.join_source_type === 6) {
                            c.inviter = await discord.user(
                                guild.client,
                                guild.ownerId,
                                { fetch: true }
                            );
                        } else if (
                            c.inviter_id &&
                            [
                                1, // Bot Invite
                                5, // Normal invite.
                            ].includes(c.join_source_type)
                        ) {
                            c.inviter = await discord.user(
                                guild.client,
                                c.inviter_id,
                                { fetch: true }
                            );
                        } else {
                            c.inviter = null;
                        }
                        return c;
                    })
                );
            } else {
                // @ts-ignore
                data.members = data.members.map((c) => {
                    c.inviter = null;
                    return c;
                });
            }
            return r(status.data<FetchedMemberInvitesResponse>(data));
        });
    }
}
