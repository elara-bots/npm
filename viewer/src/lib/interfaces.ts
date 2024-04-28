import { APIMessage } from "discord-api-types/v10";

export interface InviteData {
    name: string;
    icon: string;
    url: string;
    online?: number;
    total?: number;
    partnered?: boolean;
    verified?: boolean;
}

export type MentionTypes =
    | "user"
    | "channel"
    | "role"
    | "voice"
    | "locked"
    | "thread"
    | "forum"
    | "slash"
    | "server-guide"
    | "channels-and-roles"
    | "customize-community";

export type MinMessage = Pick<
    APIMessage,
    | "edited_timestamp"
    | "id"
    | "content"
    | "author"
    | "embeds"
    | "components"
    | "attachments"
    | "sticker_items"
    | "poll"
    | "interaction"
    | "timestamp"
    | "type"
>;

export type MessageOptions = Partial<{
    /** To add the verified checkmark to the message */
    verified: boolean;
    /** To add the bot tag next to the username */
    bot: boolean;
    /** To add the server tag next to the name */
    server: boolean;
    /** To add color to the username */
    color: string;
    /** To add the username to the message (default: The message author's) */
    username: string;
    /** To add the avatar_url to the message (default: The message author's)  */
    avatar_url: string;
}>;

export type HTMLPageOptions = {
    name?: string;
    icon?: string;
    /** The amount of time to wait before showing the messages (preload the content) */
    preLoader?: number;
    /** The npm package to use for the Discord Viewer, by default it will use: https://unpkg.com/@skyra/discord-components-core */
    discordModule?: string;
    /** The image url for the loading icon */
    loadingImage?: string;
    /** The background color to use for the viewer. */
    backgroundColor?: `#${string}`;
    /** The loading message to display */
    loadingMessage?: string;
};

export type Color = `#${string}` | number;
