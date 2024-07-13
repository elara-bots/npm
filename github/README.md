# Welcome to the GitHub package
----
# Links:

## [![Docs](https://cdn.discordapp.com/emojis/792291458081095691.png?size=24) Docs](https://elara-services-github.pages.dev)
## [![Discord](https://cdn.discordapp.com/emojis/847624594717671476.png?size=24) Support](https://discord.gg/qafHJ63 "Support Server") 
## [![Patreon](https://cdn.discordapp.com/emojis/920524344042606695.png?size=24) Patreon](https://patreon.com/elaraservices "Patreon")
## [![PayPal](https://cdn.discordapp.com/emojis/1106809124299214858.png?size=24) PayPal](https://paypal.me/superchiefyt "PayPal")

----

## Getting Started

```js
    const { GitHub } = require(`@elara-services/github`);
    const git = new GitHub(`gh-****`); // Your Github auth token.
```


### Upload File: 
```js
    const r = await git.files.create({
        repo: {
            owner: `Elara-Discord-Bots`, // The repo owner.
            repo: "test", // Name of the github repo under the owner's account (org or user)
            branch: "test", // THe branch to use under the repo. (OPTIONAL, default is 'main')
        },
        url: `https://example.com/file_name.ext`, // OPTIONAL, this will fetch the data from the url and create the file from that data.
        data: `Content here`, // OPTIONAL, this will be the data added to the file.
        // 'url' or 'data' is required. You can't have both 
        message: `The commit message`, // OPTIONAL, The default is `Upload file(s) via @elara-services/github@xxx`
    });
```