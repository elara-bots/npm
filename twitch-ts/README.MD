# Getting Started

- Create your Application on https://dev.twitch.tv/console
- Once you create your application copy the clientId and clientSecret


## Setting Up
```js
const { Twitch } = require("@elara-services/twitch");
const twitch = new Twitch("YOUR_CLIENT_ID", "YOUR_CLIENT_SECRET");
```


## GET: User(s)
```js
    const res = await twitch.user([ "tfue" ]); // This can be either their login_name or their user ID 
    if (!res.status) return res.message; // When 'status' is false message is always provided.
    console.log(res); // Returns a 'data' field with an array of found user(s)
```

## GET: Stream(s) by User(s)
```js
    const res = await twitch.stream([ "tfue" ]); // This can be either their login_name or their user ID 
    if (!res.status) return res.message; // When 'status' is false message is always provided.
    console.log(res); // Returns a 'data' field with an array of found user(s)
```

## GET: Fetch Both
```js
    const res = await twitch.fetchAll([ "tfue" ]); // This can be either their login_name or their user ID 
    if (!res.status) return res.message; // When 'status' is false message is always provided.
    console.log(res); // Returns both (streams) and (users) fields with an array of found data
```


## STREAM: 

[If you want an example look in the GitHub repo -> twitch-ts -> examples]

Setup the stream client: 
```js
    const { Stream } = require(`@elara-services/twitch`);
    const stream = new Stream("YOUR_CLIENT_ID", "YOUR_CLIENT_SECRET");
```

### STREAM: Add user(s): 
```js
    // Multiple:
    stream.users.add([
        "tfue",
        "ninja"
    ]);

    // Single:
    stream.users.add("bewitching");
```

### STREAM: Remove user(s): 
```js
    // Multiple: 
    stream.users.remove([
        "tfue",
        "ninja",
    ]);

    // Single: 
    stream.users.remove("bewitching");
```

### STREAM: List user(s): 
```js
    const list = stream.users.list();
    console.log(list); // Returns an array of strings of the user's names or ids added.
```

### STREAM: Set Timer:
```js
    stream.setTimer(5); // Set the stream to search for new/update/ended live streams every 5 minutes. 
    // By default the stream searches every 6 minutes. 
```

### STREAM: Toggle Default Announcements: 
```js
    // SET
    stream.setToggle("live"); // This will turn on/off the default announcements for all users.
    stream.setToggle("update"); // This will turn on/off the default announcement updates for all users.
    stream.setToggle("ended"); // This will turn on/off the default announcement ended update for all users. 

    // VIEW:
    stream.toggles; // Returns an object: 
    // { live: boolean, update: boolean, ended: boolean }
    // By default live, update and ended is enabled.
```

### STREAM: Default Announcements: 
```js
    // Add default announcements for a user: 
    stream.announcements.add("bewitching", [
        "discord webhook url"
    ]);

    // Remove default announcements for a user: 
    stream.announcements.remove("bewitching");
    // OR remove only a certain webhook from the user: 
    stream.announcements.remove("bewitching", [
        "discord webhook url to remove"
    ]);

    // List all default announcements: 
    stream.announcements.list();
    // OR list all webhooks for a certain user: 
    stream.announcements.list("bewitching");
```

> WARNING: 
- Update and ended live streams will NOT work if the user is no longer in the package's cache (i.e: if you've restarted the process all previous announced live streams will NOT be updated or ended!)


### STREAM: Start: 
```js
    stream.run(); // This only needs to be called once, then it will automatically fetch the user's streams and let you know when they're live.
```

### STREAM: Get Duration: 
```js
    const duration = stream.getDuration(stream);
    // OR 
    const duration = stream.getDuration(stream, "[d]d, h[h], m[m], s[s]"); // Add your custom moment-duration-format option
```

### STREAM: Events: 
```js
    // Listen for new live streams: 
    stream.live((stream) => {
        // Do something with the 'stream' data. 
        console.log(`[LIVE]: ${stream.user_login}`, stream);
    });

    // Listen for updated live streams: 
    stream.update((oldStream, newStream) => {
        // Do something with the updated stream data.
        // oldStream: Will contain the data before the update happened.
        // newStream: Will contain the updated data. 
        console.log(`[LIVE:UPDATED]: ${stream.user_login}'s stream got updated`, oldStream, newStream); 
    });

    // Listen for ended live streams: 
    stream.ended((stream) => {
        // Do something with the ended stream data.
        console.log(`[LIVE:ENDED]: ${stream.user_login} is now longer live streaming.`, stream);
    });
```

-----------

# Need support?
[Support Server](https://services.elara.workers.dev/support)