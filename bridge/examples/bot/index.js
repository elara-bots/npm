const { Client } = require("discord.js");
const { Bridge } = require("@elara-services/bridge");
const client = new Client({ intents: [ "Guilds", "GuildMessages", "MessageContent" ] });

const bridge = new Bridge(client, [
    { enabled: true, categoryId: "CategoryID", webhooks: [
        "https://discord.com/api/webhooks/12345678/ASLKMDA"
    ] }
])
bridge.run();
client.on("ready", () => console.log(`[Client]: Ready!`));

client.login("DISCORD_BOT_TOKEN_HERE")