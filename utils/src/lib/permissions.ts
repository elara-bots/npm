import { is } from "@elara-services/basic-utils";

export const v13Permissions = {
    basic: ["EMBED_LINKS", "SEND_MESSAGES", "VIEW_CHANNEL", "READ_MESSAGE_HISTORY"],
    admin: "ADMINISTRATOR",
    invite: "CREATE_INSTANT_INVITE",
    nickname: "CHANGE_NICKNAME",
    members: {
        kick: "KICK_MEMBERS",
        ban: "BAN_MEMBERS",
        moderate: "MODERATE_MEMBERS",
    },
    view: { audit: "VIEW_AUDIT_LOG", insights: "VIEW_GUILD_INSIGHTS" },
    threads: {
        public: "CREATE_PUBLIC_THREADS",
        private: "CREATE_PRIVATE_THREADS",
    },
    manage: {
        server: "MANAGE_GUILD",
        roles: "MANAGE_ROLES",
        nicknames: "MANAGE_NICKNAMES",
        messages: "MANAGE_MESSAGES",
        channels: "MANAGE_CHANNELS",
        webhooks: "MANAGE_WEBHOOKS",
        emojis: "MANAGE_EMOJIS_AND_STICKERS",
        threads: "MANAGE_THREADS",
        events: "MANAGE_EVENTS",
    },
    messages: {
        view: "VIEW_CHANNEL",
        send: "SEND_MESSAGES",
        history: "READ_MESSAGE_HISTORY",
        tts: "SEND_TTS_MESSAGES",
        embed: "EMBED_LINKS",
        files: "ATTACH_FILES",
        add: "ADD_REACTIONS",
        emojis: "USE_EXTERNAL_EMOJIS",
        everyone: "MENTION_EVERYONE",
        slash: "USE_APPLICATION_COMMANDS",
        threads: "SEND_MESSAGES_IN_THREADS",
    },
    voice: {
        connect: "CONNECT",
        speak: "SPEAK",
        stream: "STREAM",
        priority: "PRIORITY_SPEAKER",
        members: {
            mute: "MUTE_MEMBERS",
            deafen: "DEAFEN_MEMBERS",
            move: "MOVE_MEMBERS",
            vad: "USE_VAD",
        },
    },
};

export const v14Permissions = {
    basic: ["EmbedLinks", "SendMessages", "ViewChannel", "ReadMessageHistory"],
    admin: "Administrator",
    invite: "CreateInstantInvite",
    nickname: "ChangeNickname",
    members: {
        kick: "KickMembers",
        ban: "BanMembers",
        moderate: "ModerateMembers",
    },
    view: { audit: "ViewAuditLog", insights: "ViewGuildInsights" },
    threads: {
        public: "CreatePublicThreads",
        private: "CreatePrivateThreads",
    },
    manage: {
        server: "ManageGuild",
        roles: "ManageRoles",
        nicknames: "ManageNickname",
        messages: "ManageMessages",
        channels: "ManageChannels",
        webhooks: "ManageWebhooks",
        emojis: "ManageGuildExpressions",
        threads: "ManageThreads",
        events: "ManageEvents",
    },
    messages: {
        view: "ViewChannel",
        send: "SendMessages",
        history: "ReadMessageHistory",
        tts: "SendTTSMessages",
        embed: "EmbedLinks",
        files: "AttachFiles",
        add: "AddReactions",
        emojis: "UseExternalEmojis",
        everyone: "MentionEveryone",
        slash: "UseApplicationCommands",
        threads: "SendMessagesInThreads",
    },
    voice: {
        connect: "Connect",
        speak: "Speak",
        stream: "Stream",
        priority: "PrioritySpeaker",
        members: {
            mute: "MuteMembers",
            deafen: "DeafenMembers",
            move: "MoveMembers",
            vad: "UseVAD",
        },
    },
};

export function checkChannelPerms(channel: any, id: string, perms: any | any[] | number | bigint = 84992n) {
    return channel?.permissionsFor?.(id)?.has?.(is.undefined(perms) ? 84992n : perms) ?? false;
}
