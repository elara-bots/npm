import { formatNumber, is, make, Nullable, time } from "@elara-services/basic-utils";
import { APIEmbedField, APIUser } from "discord-api-types/v10";
import { RobloxResponse } from "./interfaces";
import { messages } from "./utils";

export class RobloxHelpers {
    public get discord() {
        return {
            message: (
                res: RobloxResponse,
                user: Nullable<APIUser> = null,
                options?: Partial<{ showButtons: boolean, emoji: string, secondEmoji: string, color: number }>
            ) => {
                const emoji = options?.emoji ?? "▫️";
                const secondEmoji = options?.secondEmoji ?? "◽";
                const color = options?.color ?? 11701759;
                const showButtons = is.boolean(options?.showButtons) ? options?.showButtons : true;
                const fields = make.array<APIEmbedField>();

                if (res.activity) {
                    fields.push({ 
                        name: messages.ACTIVITY, 
                        // @ts-ignore
                        value: `${emoji}${messages.STATUS}: ${res.activity.lastLocation}${res.activity.placeId ? `\n${emoji}${messages.GAME_URL(`https://roblox.com/games/${res.activity.placeId}`)}` : ""}\n${emoji}${messages.LAST_SEEN}: ${res.activity.lastOnline ? `${time.long.dateTime(res.activity.lastOnline)} (${time.relative(res.activity.lastOnline)})` : "Unknown"}` })
                }
                if (res.user.bio) {
                    fields.push({ name: messages.BIO, value: res.user.bio.slice(0, 1024) });
                }
                if (is.array(res.groups)) {
                    for (const g of res.groups.slice(0, 4)) {
                        fields.push({
                            name: `${g.primary ? `[${messages.PRIMARY}] ` : ""}${g.name}`,
                            value: `${emoji}${messages.ID}: ${g.id}\n${emoji}${messages.RANK}: ${g.rank}\n${emoji}${messages.ROLE}: ${g.role}\n${emoji}${messages.LINK}: [${messages.URL}](${g.url})`,
                            inline: g.primary ? false : true
                        })
                    }
                }

                return {
                    embeds: [{
                        thumbnail: { url: res.user.avatar },
                        timestamp: new Date(),
                        fields,
                        color,
                        description: [
                            `${emoji}${messages.USERNAME}: ${res.user.username}`,
                            `${emoji}${messages.ID}: ${res.user.id}`,
                            `${emoji}${messages.PAST_NAMES}: ${res.user.lastnames.map(g => `\`${g || "None"}\``).join(", ") || "None"}`,
                            `${emoji}${messages.JOINED}: ${time.long.dateTime(res.user.joined.full)} (${time.relative(res.user.joined.full)})`,
                            `${emoji}${messages.COUNTS}:`,
                            `${secondEmoji}${messages.GROUPS}: ${formatNumber(res.groups.length)}`,
                            `${secondEmoji}${messages.FRIENDS}: ${formatNumber(res.user.counts.friends)}`,
                            `${secondEmoji}${messages.FOLLOWERS}: ${formatNumber(res.user.counts.followers)}`,
                            `${secondEmoji}${messages.FOLLOWING}: ${formatNumber(res.user.counts.following)}`,
                        ].join("\n"),
                        author: messages.AUTHOR(user, res),
                        footer: messages.FOOTER(res.groups.length > 4)
                    }],
                    components: showButtons && [
                        {
                            type: 1, components: [
                                { type: 2, style: 5, label: messages.PROFILE, url: res.user.url, emoji: { id: "411630434040938509" } },
                                { type: 2, style: 5, label: messages.AVATAR, url: res.user.avatar, emoji: { id: "719431405989396530" } }
                            ]
                        }
                    ] || []
                }
            }
        };
    }
}