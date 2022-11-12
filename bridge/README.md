# Getting Started


# NOTES
- This requires the following intents: `GUILD_MESSAGES`, `MESSAGE_CONTENT` to work!
- The bridge will not repost any messages from the webhookId provided in the 'webhooks' array! (to avoid spam)
- This needs either discord.js v13 or v14!


## Import the Bridge Client
```js
const { Bridge } = require("@elara-services/bridge");
```

## Configure the bridge
```js
const bridge = new Bridge(client, [ // You can have multiple bridge channels 
    {
        enabled: true, // True: Post to the webhooks in the array below
        webhooks: [ // Array of webhooks to post to.
            "https://discord.com/api/webhooks/xxxx", 
        ],
        username: "", // OPTIONAL: The username overrides the message author/member info | View "Username formats" below!
        avatarURL: "", // OPTIONAL: The avatar URL overrides the message author/member avatar URL
        includeAllMessages: false,  // OPTIONAL: The 'includeAllMessages' boolean will bridge ALL messages in the channel/category ID provided. (DEFAULT: FALSE)
        // By default this will only allow crossposted messages to be announced.
        showMemberProfile: false, // OPTIONAL: THe 'showMemberProfile' boolean will make the username and avatarURL for the member's info (if any) (DEFAULT: FALSE)
        channelId: "12345678", // OPTIONAL/REQUIRED: The 'channelId' is the channel it will be listening to messages in (This channel ID is only required if there is no Category ID provided)
        categoryId: "12345678" // OPTIONAL/REQUIRED: The 'categoryId' is the category it will be listening to messages in (This is only required if there is no channelId provided!)
    }
])
```

## Start Listening!
```js
bridge.run()
```


## Username Formats
- `{author.name}` - Shows the user's name (ex: `SUPERCHIEFYT`)
- `{author.tag}` - Shows the user's name and tag (ex: `SUPERCHIEFYT#0001`)
- `{author.id}` - Shows the user's ID (ex: `288450828837322764`)
- `{member.nickname}` - Shows the member's nickname/display_name (ex: `Beep Boop`)
- `{member.tag}` - Shows the member's nickname/display_name and tag (ex: `Beep Boop#0001`)