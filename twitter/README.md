# What is this package?
This announces / tells you when someone posts. 

# Support Server
> https://my.elara.services/support


# Getting Started

> **Note:** For this package you need 4 strings from the Twitter developer page for your API keys
> **consumer_key, consumer_secret, access_token_key, access_token_secret** is all required for this package to work properly.


### Creating the Twitter client 

```js
const { Twitter } = require("@elara-services/twitter");
const twitter = new Twitter({
    BearerToken: "Your bearer_token from the Twitter developer page.",
    defaultAnnouncements: true, // For the default announcement embeds (if set to false then it won't announce anything, you'll have to listen to the 'stream:post' event to create and announce with your own custom content / embeds)

    updateRulesOnStart: true, // For the package to automatically update the Twitter Stream-V2 rules 
})
```


### Adding Users
```js

twitter.addUser({ 
    name: "The Twitter user's username", // [REQUIRED]: The Twitter user's full username (NOT DISPLAY NAME)
    color: 0xFF0000, // [NOT_REQUIRED]: The embed's color
    webhooks: [ // [REQUIRED]: The webhook urls to announce the tweets in for the creator
        "https://discord.com/api/webhooks/..."
    ]
})
// OR For multiple users

twitter.addUsers([
    { 
        name: "The Twitter user's username", // [REQUIRED]: The Twitter user's full username (NOT DISPLAY NAME)
        color: 0xFF0000, // [NOT_REQUIRED]: The embed's color
        webhooks: [ // [REQUIRED]: The webhook urls to announce the tweets in for the creator
            "https://discord.com/api/webhooks/..."
        ]
    },
    { ... }
])
```

### Starting the Twitter Stream
```js
await twitter.start()
// This will start the twitter stream for the provided users.
// NOTE: You have to restart the twitter stream if you want to add more users! (THIS IS A TWITTER STREAM API LIMITATION)
```


### Listening to Events
```js

// Stream Start
twitter.on("stream:start", () => console.log(`The twitter stream started!`));

// Stream End
twitter.on("stream:end", (response) => console.log(`The twitter stream ended!`, response));

// Stream Error
twitter.on("stream:error", (error) => console.warn(`The twitter stream had an error!`, error));

// Stream Post
twitter.on("stream:post", (body, user) => console.log(`New tweet!`, body, user));
// User should always return { id: string, color: string | number, webhooks: [] }

// Webhook Errors
twitter.on("webhook:error", (error) => console.log(`We've hit an error while sending to the webhook!`, error));
```

### Formatting the Twitter Post Data
```js
const body = twitter.fetchData(postData, userData);
console.log(body);
// Note: This can return 'null' and 'userData' isn't required for this function
```

### Fetching a user
```js
const user = await twitter.fetchUser("SUPERCHIEFYT").catch(() => {});
console.log(user);
// Returns the fetched user data 
```

### Customizing the Twitter announcements
```js
twitter.on("stream:post", async (post, user) => {
    let data = twitter.fetchData(post, user);
    if (!data) return;
    return twitter.send({
        webhook: data.webhooks,
        username: "Whatever you want the webhook's name to be called",
        avatar_url: "The image url you want the webhook to have",
        content: "Message Content, if you want it",
        embeds: [
            {
                title: "Customize the embed(s)"
            }
        ],
        components: [] // Add components (ONLY WORKS FOR APPLICATION/BOT OWNED WEBHOOKS, DISCORD LIMITATION)
    })

    // NOTE: 'content', 'embeds' or 'components' You need one of those for anything to be sent!
})
```