import {
    colors,
    getPluralTxt,
    is,
    limits,
    removeAllBrackets,
} from "@elara-services/utils";
import { EmbedBuilder } from "@discordjs/builders";
import type { CustomMessage, GiveawayDatabase } from "./interfaces";

export const messages = {
    def: {
        winner: (winners: string[], db: GiveawayDatabase): CustomMessage => {
            return {
                content: is.array(winners)
                    ? `Congratulations to ${winners
                          .map((c) => `<@${c}>`)
                          .join(", ")}! 🎉${
                          db.host && db.host.mention === true
                              ? `\n-# Hosted by: <@${db.host.id}>`
                              : ""
                      }`
                    : `No one won the giveaway! 😔${
                          db.host && db.host.mention === true
                              ? `\n-# Hosted by: <@${db.host.id}>`
                              : ""
                      }`,
            };
        },
        reroll: (
            winners: string[],
            db: GiveawayDatabase,
            userId: string
        ): CustomMessage => {
            return {
                content: is.array(winners)
                    ? `Congratulations to ${winners
                          .map((c) => `<@${c}>`)
                          .join(", ")}! 🎉${
                          db.host && db.host.mention === true
                              ? `\n-# Hosted by: <@${db.host.id}>`
                              : ""
                      }\n-# Rerolled by: <@${userId}>`
                    : `No one won the giveaway! 😔${
                          db.host && db.host.mention === true
                              ? `\n-# Hosted by: <@${db.host.id}>`
                              : ""
                      }\n-# Rerolled by: <@${userId}>`,
            };
        },
        end: (db: GiveawayDatabase, winners: string[]) => {
            return new EmbedBuilder()
                .setColor(colors.red)
                .setAuthor({ name: `🎊 GIVEAWAY ENDED 🎊` })
                .setTitle(removeAllBrackets(db.prize.slice(0, limits.title)))
                .setFooter({ text: `ID: ${db.id} | Ended at` })
                .setTimestamp(new Date(db.end))
                .setFields([])
                .setDescription(
                    `- Winner${getPluralTxt(winners)}: ${
                        is.array(winners)
                            ? winners.map((c) => `<@${c}>`).join(", ")
                            : `No one??`
                    }${db.host?.id ? `\n- Hosted by: <@${db.host.id}>` : ""}`
                );
        },
    },
};
