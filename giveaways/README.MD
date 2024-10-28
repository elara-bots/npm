# Welcome to the Giveaways package!

# Links:

## [![Docs](https://cdn.discordapp.com/emojis/792291458081095691.png?size=24) Docs](https://elara-services-giveaways.pages.dev)
## [![Discord](https://cdn.discordapp.com/emojis/847624594717671476.png?size=24) Support](https://discord.gg/qafHJ63 "Support Server") 
## [![Patreon](https://cdn.discordapp.com/emojis/920524344042606695.png?size=24) Patreon](https://patreon.com/elaraservices "Patreon")
## [![PayPal](https://cdn.discordapp.com/emojis/1106809124299214858.png?size=24) PayPal](https://paypal.me/superchiefyt "PayPal")


------

## Getting Started

### TypeScript
```ts
    import { GiveawayClient } from "@elara-services/giveaways";
    import { Client } from "discord.js";
    const client = new Client({
        intents: [ "Guilds" ],
    });
    const gw = new GiveawayClient(client, { url: "mongodb://localhost/Giveaways" });
```
### JavaScript
```js
    const { GiveawayClient } = require("@elara-services/giveaways");
    const { Client } = require("discord.js");
    const client = new Client({
        intents: [ "Guilds" ],
    });
    const gw = new GiveawayClient(client, { url: "mongodb://localhost/Giveaways" });
```
-----
## Create Giveaway
```js
    const res = await gw.api.create({
        ...ADD_GIVEAWAY_OPTIONS
    });
```
-----

## Default Giveaway Handler
```js
    await gw.handler();
    // OR 
    await gw.handler(OPTIONAL_GIVEAWAY_FILTER);
```

-----
## Add User To Giveaway
```js
    const res = await gw.users("USER_ID").add("GIVEAWAY_ID", ENTRIES_COUNT, INTERACTION_RESPONDER);
```
----
## Interaction Handler
```js
    client.on("interactionCreate", async (i) => {
        if (i.isButton() || i.isModalSubmit()) { // This will handle the interactions for the buttons and everything else.
            return gw.interactions.main(i, filter);
        }
    });
```