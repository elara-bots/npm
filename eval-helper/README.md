# Getting Started
- ***Note***: this is mostly for Discord bots, this can be used with eris, discord.js or any lib


```js
const { getCode, clean } = require("@elara-services/eval-helper");

const code = await getCode({
    code: "'test'",
    // The code you want to eval. (NOT REQUIRED IF ATTACHMENT IS PRESENT)
    attachment: "https://cdn.exmaple.com/:id.js", // OR 'txt' (NOT REQUIRED IF CODE IS PRESENT)
    // Attachment fetches the JS or TXT file then gets the code from it then returns it in the response. 
    async: true, // Force it to return the async code
});

const r = await clean(eval(code)); // With no censors. (The text to replace in the returned response)

// OR with censors
const r = await clean(eval(code), [
    "ABCDEFG"
]);
// If it's found in the response then it will be replaced by `[X]`
// This is mostly useful to censor bot tokens, API keys or smth you don't want to be returned

return r; // To get the returned response

// OR 
return message.channel.send(`\`\`\`js\n${r}\`\`\``); // discord.js

// OR
return message.channel.createMessage(`\`\`\`js\n${r}\`\`\``); // eris
``` 

# FAQ

### **Why create this package?**
-----
***Simple:*** 
> I wanted to be able to use the eval code on multiple bots/services without duplicating code everywhere and why not just open source it? 🤷
-----
