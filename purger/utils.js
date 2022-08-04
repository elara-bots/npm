const { Collection, SnowflakeUtil } = require("discord.js");

exports.fetchMessages = async (channel, limit = 50, before, after, around) => {
    if (limit && limit > 100) {
        let logs = [];
        const get = async (_before, _after) => {
            const messages = [...(await channel.messages.fetch({ limit: 100, before: _before || undefined, after: _after || undefined }).catch(() => new Collection())).values()];
            if (limit <= messages.length) {
                return (_after ? messages.slice(messages.length - limit, messages.length).map((message) => message).concat(logs) : logs.concat(messages.slice(0, limit).map((message) => message)));
            }
            limit -= messages.length;
            logs = (_after ? messages.map((message) => message).concat(logs) : logs.concat(messages.map((message) => message)));
            if (messages.length < 100)  return logs;
            return get((_before || !_after) && messages[messages.length - 1].id, _after && messages[0].id);
        };
        return get(before, after);
    }
    return [ ...(await channel.messages.fetch({ limit, before, after, around }).catch(() => new Collection())).values() ];
}

exports.deleteMessages = async (channel, messageIDs) => {
    if (messageIDs.length <= 0) throw new Error(`[PURGER:deleteMessages]: No messages provided!`);
    messageIDs = messageIDs.filter(id => Date.now() - SnowflakeUtil.deconstruct(id).timestamp < 1209600000)
    if (messageIDs.length <= 100) {
        await channel.bulkDelete(messageIDs, true).catch(() => new Collection());
        return messageIDs;
    }
    let [ chunks, i ] = [
        this.chunk(messageIDs, 100),
        0
    ];
    for (const chunk of chunks) {
        i++;
        setTimeout(() => channel.bulkDelete(chunk, true).catch(() => new Collection()), i * 2000);
    }
    return messageIDs;
}