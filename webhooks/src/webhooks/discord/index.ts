import { REST, RawFile, makeURLSearchParams } from "@discordjs/rest";
import { field, hasBit, is, limits, resolveColor, status } from "@elara-services/utils";
import type { APIActionRowComponent, APIEmbed, APIMessage, APIMessageActionRowComponent } from "discord-api-types/v10";
import type { DiscordWebhookData, DiscordWebhookOptions, sendOptions } from "../../interfaces";
import { defaultOptions, error, url, validateURL } from "./utils";
const rest = new REST();

/**
 * @description A Discord webhook message builder for webhook URLs 
 */
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
            flags: undefined,
            username: options.username || undefined,
            avatar_url: options.avatar_url || undefined,
            embeds: [],
            content: undefined,
            components: [],
            thread_id: options.threadId || undefined,
            allowed_mentions: undefined,
            files: [],
        }
    }

    isEmpty(): boolean {
        return !is.string(this.data.content) && !is.array(this.data.embeds) && !is.array(this.data.components) && !is.array(this.data.files)
    }

    public setFlags(bit: number) {
        this.data.flags = bit;
        return this;
    }

    setAllowedMentions(opt: sendOptions['allowed_mentions']) {
        this.data.allowed_mentions = opt;
        return this;
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

    file(data: RawFile) {
        this.data.files.push(data);
        return this;
    }
    files(data: RawFile[]) {
        for (const d of data) {
            this.file(d);
        }
        return this;
    }

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

    /** Why is the 'arr' type unknown? because this is for components_v2 and that doesn't have any types yet. */
    public components(arr: unknown[]) {
        for (const c of arr) {
            this.component(c);
        }
        return this;
    }
    /** Why is the 'arr' type unknown? because this is for components_v2 and that doesn't have any types yet. */
    public component(arr: unknown) {
        const flag = this.data.flags || 0;
        if (!hasBit(flag, 1 << 15)) {
            if (is.number(flag, false)) {
                this.data.flags = flag | 1 << 15;
            } else {
                this.data.flags = 1 << 15;
            }
        }
        this.data.components.push(arr as any);
        return this;
    }

    async send() {
        if (this.isEmpty()) return error(`You didn't add anything to be sent.`)
        const Url = url(this.url);
        if (!Url) {
            return null;
        }
        if (hasBit((this.data.flags || 0), 1 << 15) && (is.string(this.data.content) || is.array(this.data.embeds))) {
            return error(`You included the 'components_v2' flag but you have 'content' or 'embeds' in the request (this fields isn't supported for components_v2)`);
        }
        let r = await rest.post(`/${Url.path}`, {
            auth: false,
            body: this.data,
            files: this.data.files || undefined,
            query: makeURLSearchParams({
                wait: true,
                with_components: true,
                thread_id: this.data.thread_id || Url.thread_id,
            })
        })
            .then(r => status.data<APIMessage>(r as APIMessage))
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
        if (this.isEmpty()) return error(`You didn't add anything to be sent.`)
        const Url = url(this.url);
        if (!Url || !Url.path) {
            error(`You didn't provide a valid webhook?`);
            return;
        }
        return await rest.patch(`/${Url.path}/messages/${messageId}`, {
            body: this.data,
            auth: false,
            files: this.data.files || undefined,
            query: makeURLSearchParams({
                wait: true,
                with_components: true,
                thread_id: this.data.thread_id || Url.thread_id
            })
        })
            .then(r => status.data(r as APIMessage))
            .catch(e => error(e));
    }
}