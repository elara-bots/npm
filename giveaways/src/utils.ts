import { is } from "@elara-services/utils";
import type { CustomMessage, GiveawayDatabase } from "./interfaces";
// import { EmbedBuilder } from "@discordjs/builders";
// import { colors } from "@elara-services/utils";

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
                // embeds: [
                //     new EmbedBuilder()
                //     .setColor(colors.purple)
                //     .
                //     .toJSON()
                // ]
            };
        },
    },
};

export const EVENTS = {
    GIVEAWAY_USER_ADD: "giveawayUserAdd",
    GIVEAWAY_USER_REMOVE: "giveawayUserRemove",
    GIVEAWAY_USER_UPDATE: `giveawayUserUpdate`,
    GIVEAWAY_START: "giveawayStart",
    GIVEAWAY_END: "giveawayEnd",
    GIVEAWAY_CANCEL: "giveawayCancel",
};
