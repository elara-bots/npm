import { Guild, GuildMember, User } from "discord.js";
import { timeFormat } from "./times";

export async function parser(obj: object = {}, options: ParserOptions = {}): Promise<object> {
    let str = JSON.stringify(obj);
    const r = (names: string[], s: string) => {
        str = str.replace(new RegExp(names.join("|"), "gi"), s);
    };
    if (options.member) {
        options.user = options.member.user;
        options.guild = options.member.guild;
    }
    if (options.guild) {
        const { guild } = options;
        const owner = await guild.fetchOwner().catch(() => null);
        if (owner) {
            r([p.owner.username], owner.user.username);
            r([p.owner.mention, p.owner.user], owner.toString());
            r([p.owner.id], owner.id);
            r([p.owner.avatar], owner.user.displayAvatarURL());
        }
        r([p.guild.name, p.guild.server], guild.name);
        r([p.guild.icon], guild.iconURL() as string);
        r([p.guild.banner], (guild.banner ? guild.bannerURL() : "") as string);
        r([p.guild.splash], guild.discoverySplashURL() as string);
        r([p.guild.created], guild.createdAt.toLocaleString());
        r([p.guild.createdDiscordTimestamp], timeFormat(guild.createdAt, true, "f"));
        r([p.guild.vanity], guild.vanityURLCode || "N/A");
        r([p.guild.features], guild.features.join(", "));
    }
    if (options.user) {
        const { user } = options;
        r([p.user.username], user.username);
        r([p.user.mention, p.user.user], user.toString());
        r([p.user.id], user.id);
        r([p.user.avatar], user.displayAvatarURL());
        r([p.user.accentColor], user.hexAccentColor || "N/A");
        r([p.user.banner], user.banner ? user.bannerURL() || "" : "");
        r([p.user.created], user.createdAt.toLocaleString());
        r([p.user.createdDiscordTimestamp], timeFormat(user.createdAt, true, "f"));
    }

    if (options.member) {
        const { member } = options;
        r([p.member.avatar], member.displayAvatarURL());
        r([p.member.joined], member.joinedAt?.toLocaleString() || "N/A");
        if (member.joinedAt) {
            r([p.member.joinedDiscordTimestamp], timeFormat(member.joinedAt, true, "f"));
        }
        r([p.member.nickname], member.nickname || "N/A");
        r([p.member.roles], member.roles.cache.map((c) => `\`${c.name}\``).join(", "));
        if (member.communicationDisabledUntil) {
            r([p.member.timeout], member.communicationDisabledUntil?.toLocaleString() || "N/A");
            r([p.member.timeoutDiscordTimestamp], timeFormat(member.communicationDisabledUntil, true, "f"));
        }
    }

    return JSON.parse(str);
}

export type ParserOptions = {
    guild?: Guild;
    member?: GuildMember;
    user?: User;
};

export const p = {
    owner: {
        user: "%owner%",
        mention: "%owner_mention%",
        username: "%owner_username%",
        id: "%owner_id%",
        avatar: "%owner_avatar%",
    },
    guild: {
        server: "%server%",
        name: "%server_name%",
        icon: "%server_icon%",
        splash: "%server_splash%",
        banner: "%server_banner%",
        created: "%server_created%",
        createdDiscordTimestamp: "%server_created_timestamp%",
        vanity: "%server_vanity%",
        features: "%server_features%",
    },
    user: {
        user: "%user%",
        mention: "%user_mention%",
        username: "%user_username%",
        id: "%user_id%",
        avatar: "%user_avatar%",
        accentColor: "%user_accentColor%",
        banner: "%user_banner%",
        created: "%user_created%",
        createdDiscordTimestamp: "%user_created_timestamp%",
    },
    member: {
        joined: "%member_joined%",
        joinedDiscordTimestamp: "%member_joined_timestamp%",
        nickname: "%member_nickname%",
        roles: "%member_roles%",
        avatar: "%member_avatar%",
        timeout: "%member_timeout%",
        timeoutDiscordTimestamp: "%member_timeout_timestamp%",
    },
};
