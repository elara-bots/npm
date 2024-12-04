import { fetch } from "@elara-services/packages";
import { APIEmbed } from "discord-api-types/v10";
import { is, make } from "./is";
import { status } from "./status";

export type MessageData = {
    content: string;
    embeds: APIEmbed[];
    components: object[];
};

export type DiscohookData = {
    data: {
        version: string;
        messages: {
            _id: string;
            data: MessageData;
        }[];
    };
    expires: string;
};

export const disco = {
    fetch: async (shareId: string) => {
        const r = await fetch<any, DiscohookData>(`https://discohook.app/api/v1/share/${shareId}`);
        if (!r) {
            return status.error(`Unable to fetch (${shareId}) share ID`);
        }
        return status.data(r);
    },
    messages: async (id: string) => {
        const data = await disco.fetch(id);
        if (!data.status) {
            return data;
        }
        const messages = make.array<MessageData>();
        for (const r of data.data.data.messages) {
            messages.push(r.data);
        }
        if (!is.array(messages)) {
            return status.error(`Unable to find any message data.`);
        }
        return status.data(messages);
    },
    validate: async (id: string) => {
        const r = await disco.fetch(id);
        if (!r.status || !r.data?.data || !is.array(r.data.data.messages)) {
            return false;
        }
        return true;
    },
};
