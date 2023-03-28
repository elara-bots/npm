# Roblox API 


# NODEJS WARNING
You need to have at least nodejs version 14+ or this module will NOT WORK FOR YOU! 

------------------------


This package is just a helper to fetch/get Roblox information for a Discord or Roblox user. 

You can search by username, id or Discord-mention (<@DISCORD_USER_ID>)

## Getting Started

```js
const roblox = new (require("@elara-services/roblox.js"))();
// If you want to disable a certain API, use 
const roblox = new (require("@elara-services/roblox.js"))({ apis: { rover: false } });
// To disable RoVer's API.
const roblox = new (require("@elara-services/roblox.js"))({ apis: { bloxlink: false } });
// To disable Bloxlink's API. 
const roblox = new (require("@elara-services/roblox.js"))({ apis: { rowifi: false } });
// To disable RoWfi's API. 
const roblox = new (require("@elara-services/roblox.js"))({ apis: { rocord: false } });
// To disable RoCord's API. 

// WARNING: You can't disable both, it will give you an error if you try to do that!
// By default both are enabled!
```

- Fetch by username
```js
roblox.get("SUPERCHIEFYT").then(console.log);
```

- Fetch by ID
```js
roblox.get(57908270).then(console.log);

// OR 

roblox.get("57908270").then(console.log);
```

- Fetch by Discord User
```js
roblox.get("<@288450828837322764>").then(console.log);
```

### Get User Presence(s)
```js
roblox.getPresences([ 1, 2, 57908270 ]).then(console.log);
```


### isVerified
```js
roblox.isVerified("<@288450828837322764>").then(console.log)
// returns a boolean (true/false)
```


### showDiscordMessageData
```js
let res = await roblox.get("<@288450828837322764>");
return message.channel.send(roblox.showDiscordMessageData(res));
// OR 
return interaction.reply(roblox.showDiscordMessageData(res));
```

### Change Avatar Url
```js
const roblox = new (require("@elara-services/roblox.js"))({
    avatarUrl: `https://example.com/users/%USERID%.png` // '%USERID%' is required!
});
// ....
```


### Return responses


- Success
```json
{ "status": true, "user": {}, "activity": {}, "groups": [] }
```

- Failed
```json
{ "status": false, "message": "Message here" }
```


# WARNING
**Unless you know what you're doing with Roblox cookies, I don't suggest you use it, as it CAN give access to YOUR ACCOUNT**

I'm not responsible for anyone that fucks up with it, it's your fault and **ISN'T FUCKING REQUIRED!!!**
