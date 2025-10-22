const ticketEmojiID = "1374908572982448208";

exports.messages = {
    ticketEmojiID,
    ticket: {
        open: (channelId, messageURL) => ({
            flags: 1 << 15,
            components: [
                {
                    type: 17,
                    components: [
                        {
                            type: 9,
                            accessory: {
                                type: 2,
                                style: 5,
                                label: "Jump to",
                                emoji: {
                                    id: "1077031650459926619",
                                },
                                url: messageURL,
                            },
                            components: [
                                {
                                    type: 10,
                                    content: `## <:tickets:${ticketEmojiID}> Ticket Created`,
                                },
                                {
                                    type: 10,
                                    content: `-# <#${channelId}>`,
                                },
                            ],
                        },
                    ],
                },
            ],
        }),

        close: () => ({}),
    },
};
