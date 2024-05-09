# Welcome to the redis package

# Install 
```bash
npm i @elara-services/redis
```
----
# Links:

## [![Docs](https://cdn.discordapp.com/emojis/792291458081095691.png?size=24) Docs](https://elara-services-redis.pages.dev)
## [![Discord](https://cdn.discordapp.com/emojis/847624594717671476.png?size=24) Support](https://discord.gg/qafHJ63 "Support Server") 
## [![Patreon](https://cdn.discordapp.com/emojis/920524344042606695.png?size=24) Patreon](https://patreon.com/elaraservices "Patreon")
## [![PayPal](https://cdn.discordapp.com/emojis/1106809124299214858.png?size=24) PayPal](https://paypal.me/superchiefyt "PayPal")

----

## Getting Started


```js
const { RedisClient } = require("@elara-services/redis");
const client = new RedisClient(); // Without any options it will use the default ioredis options for host and port
// OR 
const client = new RedisClient({ ... }); // To customize the ioredis client options. 
```


## Set ID Prefix
```js
client.setPrefix("prod"); // Sets the ID prefix to `prod_`
```

## Get Single Key
```js
const res = await client.rget("<id>"); // With json=true, usePrefix=true
// OR 
const res = await client.rget("<id>", false, false); // Sets json & usePrefix to false.
```

## Get Multiple Keys
```js
const res = await client.rmget(["1", "2", "3"]); // With json=true, usePrefix=true
// OR 
const res = await client.rmget(["1", "2", "3"], false, false); // With json=false, usePrefix=false
```

## Add Data/Key
- NOTES: 
 - By default all keys will expire after 10 minutes. (use `false` for `time` to store the key until you remove it)

```js
const res = await client.rset(`<id>`, `value`); // With the default time (10 minutes)
// OR
const res = await client.rset(`<id>`, `value`, false); // Remove the time limit for the key. 
// OR
const res = await client.rset(`<id>`, `value`, time_limit, time_style, use_prefix); 
```

## Delete Single/Multiple key(s)
```js
const res = await client.rdel(`<single_id>`); // Delete a single key.
// OR 
const res = await client.rdel(["1", "2", "3"]); // Delete multiple keys.
// OR add ', false' at the end to not use the prefix
```

## Get Keys
```js
const res = await client.rkeys(); // Gets all keys matching "*" 
// OR 
const res = await client.rkeys("webhooks_"); // Gets all keys matching "webhooks_"
```

## Remove all keys (flush)
- NOTE: This WILL delete all keys from the redis-server
```js
const res = await client.rflush();
// Returns "OK" or "NO"
```

## Has Key
```js
const res = await client.rhas(`<id>`); 
// OR 
const res = await client.rhas("<id>", false); // Without "usePrefix"
// Returns a boolean
```

## Get Count
```js
const count = await client.rcount(); // Gets the count matching "*"
// OR 
const count = await client.rcount("webhooks_"); // Gets the count matching "webhooks_"
// Returns a number
```

## Get All Keys (& Values)
```js
const res = await client.rall(); // Gets all keys & data matching "*"
// OR 
const res = await client.rall("webhooks_"); // Gets all keys & data matching "webhooks_"

// Returns a map with the key:value (ex: new Map<string, object | string>())
```