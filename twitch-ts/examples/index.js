const { Stream } = require("@elara-services/twitch");
const log = (...args) => console.log(`[${new Date().toLocaleString()}]: `, ...args);
const webhooks = [
    `https://discord.com/api/webhooks/..../.....`,
];
const stream = new Stream("....", "....");
const users = [
    "ulusoka",
    "sweet_anita",
    "bewitching",
    "ninja",
    "onetopic",
    "loeya",
    "heyhuman1",
];
(async () => {
    for (const user of users) { // Add only if you want default announcements.
        stream.announcements.add(user, webhooks);
    }
    await stream.users.add(users)
    .live((stream) => log(`[LIVE]: ${stream.user_login} (${stream.duration}, ${stream.viewer_count.toLocaleString()}))`))
    .update((old, stream) => log(`[LIVE:UPDATE]: ${stream.user_login} (${old.duration} -> ${stream.duration}, ${old.viewer_count.toLocaleString()} -> ${stream.viewer_count.toLocaleString()})`))
    .ended((stream) => log(`[LIVE:ENDED]: ${stream.user_login}: Was live for: ${stream.duration}`))
    .run();
})();