export const m = {
    disabled: {
        channels: `You can't use the command in this channel.`,
        roles: `You have a role that doesn't have access to this command.`,
        users: `You don't have access to this command.`,
    },
    locked: {
        channels: `You can't use the command in this channel.`,
        roles: `You don't have any roles that has access to this command.`,
        users: `You don't have access to this command.`,
    },
    only: {
        guild: `This command can only be used in a server.`,
        dms: `This command can only be used in Direct Messages (DM)`,
        text: `This command can only be used in a text-based channel.`,
        threads: `This command can only be used in thread channels.`,
        voice: `This command can only be used in voice channels.`,
    },
    not: {
        found: (name: string) => `Unable to find (${name}) command.`,
        enabled: (name: string) => `Command (${name}) isn't enabled.`,
        guild: `This command can't be used in a server.`,
        dms: `This command cann't be used in Direct Messages (DM)`,
        text: `This command can't be used in a text-based channel.`,
        threads: `This command can't be used in thread channels.`,
        voice: `This command can't be used in voice channels.`,
    },
};
