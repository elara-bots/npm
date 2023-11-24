# Welcome to the leveling package
----
# Links:

## [![Docs](https://cdn.discordapp.com/emojis/792291458081095691.png?size=24) Docs](https://elara-services-leveling.pages.dev)
## [![Discord](https://cdn.discordapp.com/emojis/847624594717671476.png?size=24) Support](https://discord.gg/qafHJ63 "Support Server") 
## [![Patreon](https://cdn.discordapp.com/emojis/920524344042606695.png?size=24) Patreon](https://patreon.com/elaraservices "Patreon")
## [![PayPal](https://cdn.discordapp.com/emojis/1106809124299214858.png?size=24) PayPal](https://paypal.me/superchiefyt "PayPal")

----

## REQUIRED: 
- `client`: A v14 discord.js client. (this will not work with any version below v14)
- `mongodb_uri`: A mongodb connection uri. (this is for the package to save the data for servers/users/weekly)

## Features: 
- [x] XP Earning
 - Messages (with custom cooldown)
 - Voice
 - Toggle for if users should be unmuted to earn XP in voice channel(s)
- [x] Custom Levels 
 - Custom messages per-level 
 - Custom roles to add/remove when a use gets to that level
 - Toggle to only announced when someone reaches a registered level
 - Toggle if the level roles should stack (default: they don't)
- [x] Weekly Leaderboard
 - Automatic announcements
 - Weekly stats for the server's `messages`, `voice` and `xp`
 - Weekly stats for the user's `messages`, `level`, `voice` and `xp` earned that week 
 - Custom ping role(s) for when the leaderboard gets announced
- [x] Default rank image profiles 
 - Currently supported types: `arcane` and `cavancord`
- [x] Default leaderboard images 
 - Currently supported types: `canvacord`
- [x] Custom XP earned 
 - Min/Max XP earned for when sending messages.
- [x] Custom cooldown for earning XP
- [x] Custom XP Multipliers
 -  Can be limited to the entire server or only certain channels/roles.
- [x] Ignore roles/channels/users 
- [x] Level up announcements
 - Supports: DM and Channel notifications 
 - Custom content/embeds for both DM and Channel notifications.
 - Toggle for pinging the user in the level up message (can be disabled per-user as well)
- [x] Reset a user's data when they leave the server.
 - Requires the bot to have "GuildMembers" intent 
- [x] User Customization
 - `stats`: For any stats for the user (by default: `messages`, `voice`) but this could be added with any stats for the user (just use `api.users.stats.inc`)
 - `background`: Sets the background for the user's rank profiles.
 - `colors`: Sets the custom color for certain rank profiles.
 - `toggles.locked`: Freezes the user's data from earning XP 
 - `toggles.dms`: Makes the bot not DM them level announcements
 - `toggles.pings`: Makes the bot not mention them in level announcements

## Getting Started
```js
    const { Leveling } = require("@elara-services/leveling");
    const lvls = new Leveling(client, "MONGODB_URI");
    await lvls.start(); // This will tell the package to start listening for events. 
```

## Note: All data can be configured with `lvls.api.xxx`
 
-------

### Example API Functions: 
- [See the rest on the api docs](https://elara-services-leveling.pages.dev/classes/API)

#### Servers:
```js
   const server = lvls.api.servers;

   // Get the server data.
   const serverData = await server.get("server_id");
   if (serverData.status) {
        console.log(serverData.data); // Returns the settings for the server.
   }

   // Toggle leveling on/off for a server. (by default: Leveling is off for the server)
   const data = await server.toggle("server_id", "leveling");
   console.log(data.message);
```
----
#### Users: 
```js
    const users = lvls.api.users;

    // Get a user's data 
    const userData = await users.get("user_id", "server_id");
    if (userData.status) {
        console.log(userData.data); // Returns the user's data for that server.
    }
```
-----
#### Rank Profile(s): 
```js
    const data = await lvls.getRankCard("user_id", "server_id");
    // OR 
    const data = await lvls.getRankCard("user_id", "server_id", "rank_card_type"); 
    // By default the "rank_card_type" is "arcane"

    if (data.status) { // Get the rank profile image then send it to the channel
        return channel.send({
            files: [
                { 
                    name: "profile.png",
                    attachment: data.image,
                }
            ]
        });
    }
```

----
#### Get Leaderboard Image
```js
    const data = await lvls.getLeaderboard("server_id");
    // OR 
    const data = await lvls.getLeaderboard(
        "server_id",
        {
            page: 1, // The page for the leaderboard image
            perPage: 5, // Up to 10 users returned in the leaderbaord image
            sort: "top", // Sort by "top" or "bottom"
            sortBy: "xp", // Sortby "xp" or "level" 
        },
        "canvacord",
        false, // If you want the weekly leaderboard, set this to: true
    )
    if (data.status) {
        // Get the leaderboard image then send it to the channel. 
        return channel.send({
            files: [
                {
                    name: "lb.png",
                    attachment: data.image,
                }
            ]
        });
    }
```
----