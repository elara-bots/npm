# Package: **[@elara-services/purger](https://www.npmjs.com/package/@elara-services/purger)**


## Getting Started

```js

const { Purger } = require("@elara-services/purger");

const purge = new Purger(message.channel, 100); 
// Channel you want to purge in and the amount of messages to delete, can be any amount (NOTE: The bot can only fetch up to 100 messages at a time, so be very careful what you set this to!)
// Default Max Amount: 500

let amount = await purge.init()
return message.reply(`I've purged ${amount} amount of messages!`);
```



### Changing the default max amount
```js
const { Purger } = require("@elara-services/purger");

const purge = new Purger(message.channel, 100, false, 1000); 
// The 4th option will change the maxLimit to 1k

let amount = await purge.init()
return message.reply(`I've purged ${amount} amount of messages!`);
```