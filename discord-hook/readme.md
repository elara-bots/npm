## Instructions

###### Info
Things with `[]` next to them means an array of that thing.

```js
const Webhook = require("discord-hook"),
      webhook = new Webhook("https://discord.com/api/webhooks/.....");
      webhook
      .addEmbed(EMBED_DATA)
      .addEmbeds(EMBED_DATA[])
      .embeds(EMBED_DATA[])
      .embed(EMBED_DATA) // Look below for the EMBED_DATA information
      .content(`The content of the message`)
      .mention(`<@USERID>`) // or <@&ROLEID>
      .username(`The username of the webhook`) // or ".name()"
      .icon(`The avatar/icon of the webhook`) // or ".avatar()"
      .send(); // This returns the message object from the webhook being sent
```

#### Edit webhook messages
```js
const webhook = new (require("discord-hook"))("https://discord.com/api/webhooks/....");

    webhook
      .addEmbed(EMBED_DATA)
      .addEmbeds(EMBED_DATA[])
      .embeds(EMBED_DATA[])
      .embed(EMBED_DATA) // Look below for the EMBED_DATA information
      .content(`The content of the message`)
      .mention(`<@USERID>`) // or <@&ROLEID>
      .username(`The username of the webhook`) // or ".name()"
      .icon(`The avatar/icon of the webhook`) // or ".avatar()"
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


##### Style from [elara-hook](https://npmjs.com/package/elara-hook)
```js
const Webhook = require("discord-hook"),
      webhook = new Webhook.old("https://discord.com/api/webhooks/.....");
      webhook
      .setContent("Content") // Content of the message.
      .setMention("<@userid> or <@&roleid>") // Mentions the user or role at the start of the message content.
      .setAvatar("Image URL") // Sets the avatar icon for the webhook
      .setUsername("Discord") // Sets the username for the webhook.
      .setTitle("Title") // Title of the embed
      .setDescription("Description") // Description of the embed
      .setAuthor("Name", "Image", "LINK") // Author of the embed
      .setColor("#ff0000") // or `.setColour("#ff0000")` Color of the embed
      .setFooter("Name", "Image") // Footer of the embed
      .setThumbnail("Image URL") // Thumbnail of the embed
      .setImage("Image URL") // Image of the embed
      .addField("Name", "Value", true) // Adds a field to the embed, max 25
      .addBlankField(true) // Adds a blank field to the embed, true, false to make it inline
      .setTimestamp(optional_time) //  Adds the timestamp to the embed.
      .setURL(`URL`) // Adds the url for the title.
      .send() // Sends the message/embed.
```


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