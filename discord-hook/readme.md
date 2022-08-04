## Instructions

###### Info
Things with `[]` next to them means an array of that thing.

```js
const Webhook = require("discord-hook"),
      webhook = new Webhook("https://discord.com/api/webhooks/.....", { 
          username: "The username of the webhook", 
          avatar_url: "The avatar/icon of the webhook" 
    });
      webhook
      .embeds(EMBED_DATA[])
      .embed(EMBED_DATA) // Look below for the EMBED_DATA information
      .content(`The content of the message`)
      .mention(`<@USERID>`) // or <@&ROLEID>
      .avatar(`The username of the webhook`, `The avatar/icon of the webhook`)
      .send(); // This returns the message object from the webhook being sent
```

#### Edit webhook messages
```js
const webhook = new (require("discord-hook"))("https://discord.com/api/webhooks/....");

    webhook
      .embeds(EMBED_DATA[])
      .embed(EMBED_DATA) // Look below for the EMBED_DATA information
      .content(`The content of the message`)
      .mention(`<@USERID>`) // or <@&ROLEID>
      .avatar(`The username of the webhook`, `The avatar/icon of the webhook`)
      .edit(`MESSAGE_ID`);
    // This edits the webhook message in the channel, 
    // NOTE: The webhook url needs to be the webhook that created the message. 
```


###### Helper Method(s)
```js
Method: .helpers.blank
Description: That provides a blank character "\u200b"

Method: .field(name, value, inline)
Description: Returns the {name: "", value: "", inline: false} object
```
-------

### Embed Data
```js
{
    "title": "",
    "description": "",
    "color": "",
    "timestamp": new Date(),
    "url": "",
    "author": {
        "name": "",
        "icon_url": "",
        "url": ""
    },
    "footer": {
        "text": "",
        "icon_url": ""
    },
    "fields": [
        {
            "name": "",
            "value": "",
            "inline": true // or false
        }
    ]
}
```
