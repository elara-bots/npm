# Welcome to the Downloader package
----
# Links:

## [![Docs](https://cdn.discordapp.com/emojis/792291458081095691.png?size=24) Docs](https://elara-services-downloader.pages.dev)
## [![Discord](https://cdn.discordapp.com/emojis/847624594717671476.png?size=24) Support](https://discord.gg/qafHJ63 "Support Server") 
## [![Patreon](https://cdn.discordapp.com/emojis/920524344042606695.png?size=24) Patreon](https://patreon.com/elaraservices "Patreon")
## [![PayPal](https://cdn.discordapp.com/emojis/1106809124299214858.png?size=24) PayPal](https://paypal.me/superchiefyt "PayPal")

----

## Getting Started
- NOTE: This package will automatically create the directories the file_path has if it doesn't exist! 

```js
    const { Downloader } = require("@elara-services/downloader");

    // Without default directory. ('path' required to be included per-download)
    const client = new Downloader();

    // With default directory 
    const client = new Downloader(`${process.cwd()}/downloads`); // Will download all files to the downloads folder. 
```


### Set Default Directory/Folder
```js
    // SET
    // NOTE: This WILL create the directory if it doesn't exist!
    client.setDefaultDirectory(`${process.cwd()}/downloads`); // Sets the default directory as `/downloads`

    // RESET
    client.setDefaultDirectory(null);
```

### Download File:
```js
    // Will extract the file name and extension from the link.
    const r = await client.file(`LINK_HERE`); // Downloads the file to the default directory.

    // With options.
    const r = await client.file(`LINK_HERE`, {
        name: `boop`, // [OPTIONAL]: Only use a file name not the extension! (extension is automatically set!)
        path: `${process.cwd()}/images`, // [OPTIONAL]: OR `${process.cwd()}/images/file_name.png` (an exact path name you want to use)
        extractFilename: false, // [OPTIONAL]: If false it won't extract the file name and use the one you provided.
        maxRedirects: 2, // [OPTIONAL]: The max redirects to follow before erroring out. (default: 21)
        // ...other_https_client_options,
    });
    // Use 'r'
```

### Download Files:
```js
    const r = await client.files([
        { url: `....` },
        { url: `....`, ...other_file_info_above },
    ]);
    // Returns { success: string[], errors: Error[] }
```