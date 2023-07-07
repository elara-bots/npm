import { REST, makeURLSearchParams } from "@discordjs/rest";
import { field, limits } from "@elara-services/utils";
import type { APIActionRowComponent, APIEmbed, APIMessageActionRowComponent } from "discord-api-types/v10";
import type { DiscordWebhookData, DiscordWebhookOptions } from "../../interfaces";
import { defaultOptions, error, is, resolveColor, status, url, validateURL } from "./utils";
const rest = new REST();

export class DiscordWebhook {
    private url: string;
    private data: DiscordWebhookData;
    public constructor(url: string, options: DiscordWebhookOptions = defaultOptions) {
        if (!validateURL(url)) {
            error(`You didn't provide any webhook url or you provided an invalid webhook url`);
        }
        this.url = url;
        if (typeof options !== "object") {
            options = defaultOptions;
        };
        this.data = {
            username: options.username || undefined,
            avatar_url: options.avatar_url || undefined,
            embeds: [],
            content: undefined,
            components: [],
            thread_id: options.threadId || undefined
        }
    }

    field(name: string = "\u200b", value: string = "\u200b", inline: boolean = false) {
        return field(name, value, inline);
    }

    author(username: string = "", avatar: string = "") {
        if (is.string(username) && username.length >= 2) {
            this.data.username = username;
        }
        if (is.string(avatar) && avatar.match(/https?:\/\//gi)) {
            this.data.avatar_url = avatar;
        };
        return this;
    };

    mention(text: string = "") {
        if (is.string(text) && text.match(/<@(!|&)?/gi)) {
            this.data.content = `${text}${this.data.content ? `, ${this.data.content}` : ""}`;
        }
        return this;
    };

    content(text: string = "") {
        if (!is.string(text)) {
            return this;
        }
        if (text.length > limits.content) {
            text = text.slice(0, limits.content);
        }
        if (this.data.content) {
            this.data.content = this.data.content += text;
        } else {
            this.data.content = text;
        }
        return this;
    };

    embed(embed: APIEmbed) {
        if (this.data.embeds.length > 10) {
            return this;
        }
        if ("color" in embed && is.string(embed.color)) {
            embed.color = resolveColor(embed.color);
        };
        this.data.embeds.push(embed);
        return this;
    };
    embeds(embeds: APIEmbed[] = []) {
        for (const embed of embeds) {
            this.embed(embed);
        }
        return this;
    };

    button(data: APIActionRowComponent<APIMessageActionRowComponent>) {
        this.data.components.push(data);
        return this;
    };
    buttons(components: DiscordWebhookData['components'] = []) {
        for (const component of components) {
            this.button(component);
        }
        return this;
    };

    async send(force: boolean = false, token: string = "") {
        if (token) {
            rest.setToken(token);
        }
        if (!this.data.content && !this.data.embeds.length && !this.data.components.length) return error(`You didn't add anything to be sent.`)
        const Url = url(this.url);
        if (!Url) {
            return;
        }
        let r = await rest.post(`/${Url.path}`, { 
            auth: false, 
            body: this.data, 
            query: makeURLSearchParams({ 
                wait: true, 
                thread_id: this.data.thread_id || Url.thread_id 
            }) 
        })
            .then(r => status(true, r))
            .catch(e => error(e))
        if (!r?.status) {
            error(r?.data || "Unknown Issue while sending");
        }
        return r?.data ?? null;
    }

    async edit(messageId: string = "") {
        if (!is.string(messageId)) {
            error(`You didn't provide a message ID.`);
            return;
        }
        if (!this.data.content && !this.data.embeds.length && !this.data.components.length) return error(`You didn't add anything to be sent.`)
        const Url = url(this.url);
        if (!Url || !Url.path) {
            error(`You didn't provide a valid webhook?`);
            return;
        }
        return await rest.patch(`/${Url.path}/messages/${messageId}`, { 
            body: this.data, 
            auth: false, 
            query: makeURLSearchParams({ 
                wait: true, 
                thread_id: this.data.thread_id || Url.thread_id 
            }) 
        })
        .then(r => status(true, r))
        .catch(e => error(e));
    }
}