import { WebhookClient, type Client, type Message } from "discord.js";

export class Bridge {
    private client: Client;
    private options: BridgeOptions[];
    public constructor(client: Client, options: BridgeOptions[]) {
        this.client = client;
        this.options = options;
    };

    public run() {
        this.client.on("messageCreate", this.handleMessageCreate);
    }

    public handleMessageCreate(m: Message) {
        if (!this.options.length) return;
        for (const option of this.options) {
            if (!option.includeAllMessages) {
                if (!m.webhookId) {
                    if (!m.flags.has(1 << 1)) continue;
                }
            }
            if (!option.enabled || !option.webhooks.length) continue;
            if ("parentId" in m.channel && m.channel?.parentId === option.categoryId) this.send(option, m);
            else if (m.channelId === option.channelId) this.send(option, m);
        }
    }

    public send(option: BridgeOptions, message: Message) {
        if (!option?.webhooks?.length) return;
        const send = (url: string) => {
            const Url = new URL(url);
            if (Url.pathname.includes(message.webhookId || "")) return;

            let username = message.author.discriminator === "0000" ? message.author.username : message.author.tag,
                avatarURL = message.author.displayAvatarURL();

            if (option?.showMemberProfile && message.member && message.member.displayName !== message.author.username) {
                username = `${message.member.displayName} (${username})`;
                avatarURL = message.member.displayAvatarURL()
            };
            if (option.username?.length) {
                username = option.username
                    .replace(/{author.name}/gi, message.author.username)
                    .replace(/{author.tag}/gi, message.author.tag)
                    .replace(/{author.id}/gi, message.author.id)
                    .replace(/{member.nickname}/gi, message.member?.displayName || message.author.username)
                    .replace(/{member.tag}/gi, `${message.member?.displayName || message.author.username}#${message.author.discriminator}`)
            }
            if (option.avatarURL?.length && option.avatarURL.startsWith("https://")) avatarURL = option.avatarURL;
            new WebhookClient({ url: `${Url.origin}${Url.pathname}` })
                .send({
                    embeds: message.embeds || undefined,
                    content: message.content || undefined,
                    // @ts-ignore
                    files: message.attachments.map(c => ({ name: c.name, attachment: c.attachment })),
                    allowedMentions: { parse: [] },
                    username, avatarURL,
                    threadId: Url.searchParams.get("thread_id") || undefined
                })
                .catch(console.warn)
        }
        for (const url of option.webhooks) {
            send(url);
        }
    }
}


export interface BridgeOptions {
    enabled: boolean;
    webhooks: string[];
    username: string;
    avatarURL: string;
    includeAllMessages: boolean;
    showMemberProfile: boolean;
    channelId: string;
    categoryId: string;
} 