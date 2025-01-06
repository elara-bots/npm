# Welcome to the BlueSky package!

# Links:

## [![Docs](https://cdn.discordapp.com/emojis/792291458081095691.png?size=24) Docs](https://elara-services-bluesky.pages.dev)
## [![Discord](https://cdn.discordapp.com/emojis/847624594717671476.png?size=24) Support](https://discord.gg/qafHJ63 "Support Server") 
## [![Patreon](https://cdn.discordapp.com/emojis/920524344042606695.png?size=24) Patreon](https://patreon.com/elaraservices "Patreon")
## [![PayPal](https://cdn.discordapp.com/emojis/1106809124299214858.png?size=24) PayPal](https://paypal.me/superchiefyt "PayPal")



# Getting Started 


## API: 
```js
    const { API } = require("@elara-services/bluesky");
    const api = new API({
        keys: [
            { username: "catoftheday.bsky.social", appKey: "THE_APP_KEY_FROM_SETTINGS", service: "OPTIONAL_SERVICE_URL" },
            // More API keys to use. 
        ],
        debug: true, // Only enable if you want the debug logs to be console logged.
        defaultService: "https://bsky.social", // The default service to use for requests. default is `https://bsky.social` (per-key service overrides this option)
    });
```

## BskyAgents: 
By default the package will use a random BskyAgent account data for the requests, to manage the agents on the fly: 

### BskyAgent: Add
```js
    api.agents.add([
        // Options like you did in the `new API().keys` option 
    ]);
```

### BskyAgent: Remove
```js
    api.agents.remove("username", "service"); // By default: The package uses the defaultService.
```

### BskyAgent: List
```js
    const list = api.agents.list();
    // Do something with the list.
```

### BskyAgent: Search
```js
    const data = api.agents.search({
        username: "xxx",
        service: "https://bsky.social", // Optional: By default the package will use the defaultService
    }); 
    // Or to search for multiple: 
    const data = api.agents.search({
        username: "xxx",
        service: "https://bsky.social", // Optional: By default the package will use the defaultService
    }, "filter");

    // Do something with the data 
```


### API: Fetch User(s): 
```js
    // Fetch one user: 
    const data = await api.users.fetch("catoftheday.bsky.social"); 
    // Do something with the data.

    // Fetch multiple users: 
    const data = await api.users.fetchMultiple(["catoftheday.bsky.social", "superchiefyt.xyz"]); 
    // Do something with the data. 
```

### API: Fetch Feed(s): 
```js
    // Fetch one user's feed: 
    const data = await api.users.feeds.fetch("catoftheday.bsky.social");
    // Do something with the data. 

    // Fetch multiple user's feeds: 
    const data = await api.users.feeds.fetchMultiple([
        "catoftheday.bsky.social",
        "superchiefyt.xyz",
    ]);
    // Do something with the data. 
```
### API: Fetch User Likes: 
```js
    const data = await api.users.likes.get("catoftheday.bsky.social");
    // Do something with the data.
```


## Stream: 
```js
    const { Stream } = require("@elara-services/bluesky");
    const stream = new Stream({
        keys: [
            { username: "catoftheday.bsky.social", appKey: "THE_APP_KEY_FROM_SETTINGS", service: "OPTIONAL_SERVICE_URL" },
            // More API keys to use. 
        ],
        searchMinutes: 2, // The minutes to wait until searching again for new posts/reposts 
        debug: true, // Only enable if you want the debug logs to be console logged.
        defaultService: "https://bsky.social", // The default service to use for requests. default is `https://bsky.social` (per-key service overrides this option)
    }, "DISCORD_BOT_TOKEN");
    // Only time "DISCORD_BOT_TOKEN" is required is when you're using the `channelId` option to announce new posts/reposts
    await stream.start(); // Start the stream and start listening to new posts/reposts 
```


### Stream: Add Users
```js
    stream.manage.add({
        handle: "catoftheday.bsky.social",
        channels: [ // If you just want to use `stream.onPost()` don't include the `channels` array (OPTIONAL)
            {
                searchId: "", // The searchId for this channel, this is only used to update this channel's info at a later date. (for: manage.set()) (OPTIONAL, by default the package will add a random ID here)
                channelId: "12345678", // Discord channel ID (optional)
                url: "https://discord.com/api/webhooks/1234567/ASDASDFWHSDF", // Discord webhook URL (optional)
                // NOTE: channelId or url is required for announcements 
                roles: [], // Array of role IDs to use for the post. (OPTIONAL)
                color: "#fffff", // Hex color to be used for the default embed. (OPTIONAL)
                showButtons: true, // To show the "View" and "View Repost" button links on the default message. (OPTIONAL)
                toggles: { // Toggle certain features on/off (OPTIONAL)
                    reposts: true, // This will exclude all reposts from being announced. (default announcements only)  
                },
                options: { // OPTIONAL
                    username: "BlueSky", // The webhook's username for the post (default: The user's username)
                    avatar: "https://....", // The webhook's avatar for the post (default: The user's avatar)
                    
                    // Customization for posts: 
                    // NOTE: This will override and replace the default embeds/buttons, if you want to reference the data from the posts, check the "parser" section. (All of these are optional)
                    content: "", 
                    
                    embeds: [ 
                        {
                            title: "New Post!",
                            description: "Go view it!"
                        }
                    ],

                    components: [], // Put whatever buttons you want on the message. (be aware, you should only use the button link ones)
                }
            }
        ]
    });
```

### Stream: Remove user
```js
    stream.manage.remove(`catoftheday.bsky.social`); 
    // OR 
    stream.manage.remove(["catoftheday.bsky.social", "thedevil.bsky.social"]); 
```

### Stream: Get User
```js
    const data = stream.manage.get("catoftheday.bsky.social");
    // do something with the data.
```

### Stream: Clear Users
```js
    stream.manage.clear();
```

### Stream: List Users
```js
    const list = stream.manage.list();
```

### Stream: Edit User
```js
    const data = stream.manage.set("catoftheday.bsky.social", "channels.unique.searchId", {
        // Use one of the params from when you added the user.
    });
```

### Stream: Parser Options: 

Package object: 
```js
    const { p } = require("@elara-services/bluesky");
    p.text; // Returns `%text%`` that will get parsed when there is a new post.  
    // There is more options to `p` 
```

Strings: 
```txt
%text% - Will return the text for the post.
%created_at% - Will return the ISO Date for the post.
%type% - The type of post "post" or "repost"
%replies% - The number of replies 
%likes% - The number of likes 
%reposts% - The number of reposts 
%links.url% - The post link 
%links.uri% - The BlueSky URI 
%links.cid% - The BlueSky CID for the post. 

User info: 
%user.name% - The user's display name (Example: Daily Cats)
%user.handle% - The user's handle (Example: catoftheday.bsky.social)
%user.id% - The user's ID 
%user.avatar% - The user's avatar url 

Repost info: (Note: All of the fields will return an empty string if it's not a repost)
%repost.user.name% - The username for the reposted user. 
%repost.user.handle% - The handle for the reposted user.
%repost.user.id% - The ID for the reposted user.
%repost.user.avatar% - The avatar for the reposted user.
%repost.created_at% - The ISO Date for the post. 

```
