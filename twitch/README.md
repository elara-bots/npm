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
if (!res.status) return res.message; // When 'status' is faise message is always provided.
console.log(res); // Returns a 'data' field with an array of found user(s)
```

## GET: Stream(s) by User(s)
```js
const res = await twitch.stream([ "tfue" ]); // This can be either their login_name or their user ID 
if (!res.status) return res.message; // When 'status' is faise message is always provided.
console.log(res); // Returns a 'data' field with an array of found user(s)
```

-----------

# Need support?
[Support Server](https://services.elara.workers.dev/support)