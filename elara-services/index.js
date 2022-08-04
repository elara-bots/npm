const userAgent = `Elara-Services (${require("./package.json").version}, https://github.com/elara-bots/Elara-Services)`,
      fetch = require("@elara-services/fetch");

module.exports = class Services {
    // TODO: Replace this with something else.
    constructor(key, baseURL = "https://my.elara.services"){
        if (!key) throw new Error(`You didn't provide an API key!`);
        if (typeof key !== "string") throw new Error(`The API key you provided isn't a string!`);
        this.baseURL = baseURL;
        /** @private */
        this.key = key;
        this.support = `${baseURL}/support`;
        this.docs = "https://elara.gitbook.io/services/wrapper/js";
    };
    async fetch(url, send = undefined, useKey = true, useBase = true) {
        try {
            let res = await fetch(`${useBase ? this.baseURL : ""}${url}`)
            .header({
                key: useKey ? this.key : "",
                "User-Agent": userAgent
            })
            .body(send)
            .send();
            return res.json();
        } catch (err) {
            console.log(err);
            return null;
        }
    };

    async ping() {
        let res = await this.fetch("/site/ping");
        if (!res) return this.send(`I was unable to fetch the site ping!`);
        return res;
    };

    get haste() {
        return {
            get: async (id, url = `https://haste.elara.services`) => {
                try{
                    if (!id) return this.send(`You didn't provide a paste ID!`);
                    let body = await this.fetch(`${url}/documents/${id}`, undefined, false, false);
                    if (!body) return this.send(`No response from the hastebin website.`);
                    return { status: true, id: body.key, content: body.data, key: `${url}/${body.key}` }
                }catch(err){
                    return this.send(err.message);
                }
            },
            post: async (content, options = {}) => {
                try{
                    if (typeof options === "string") options = { url: "https://haste.elara.services", extension: options };
                    const url = "url" in options ? options.url : "https://haste.elara.services";
                    const extension = "extension" in options ? options.extension : "js";
                    if (!content) return this.send(`You didn't provide any content!`)
                    let res = await fetch(`${url}/documents`, "POST")
                        .header("User-Agent", userAgent)
                        .body(content)
                        .send()
                        .catch(() => ({ statusCode: 500 }));
                    if (res.statusCode !== 200) return this.send(`No response from the hastebin website.`);
                    let body = res.json();
                    return { status: true, id: body.key, url: `${url}/${body.key}.${extension}` };
                }catch(err){
                    return this.send(err.message);
                }
            }
        }
    };

    get paste() {
        return {
            get: async (id) => {
                try{
                    if (!id) return this.send(`You didn't provide a paste ID!`);
                    let body = await this.fetch(`/bin/api/${id}`)
                    if (!body) return this.send(`No response from the Pastebin API`);
                    return body;
                }catch(err){
                    return this.send(err.message);
                }
            },
            post: async (title = null, content, privatePaste = false) => {
                try{
                    if (!content) return this.send(`You didn't provide any content to post to the pastebin API`);
                    if (typeof privatePaste !== "boolean") privatePaste = false;
                    let res = await fetch(`${this.baseURL}/bin/api`, "POST")
                        .header({
                            key: this.key,
                            "User-Agent": userAgent
                        })
                        .body({ content, title, priv: privatePaste }, "json")
                        .send()
                        .catch(() => ({ statusCode: 500 }))
                    if (res.statusCode !== 200) return this.send(`No response from the pastebin.`);
                    let body = res.json();
                    if (!body) return this.send(`No response from the Pastebin API!`);
                    return body;
                }catch(err){
                    return this.send(err.message);
                }
            }
        }
    };

    get api() {
        return {
            dbl: {
                get: async (token, id) => {
                    try{
                        if (!token) return this.send(`You didn't provide a Discord Bot List(top.gg) token!`);
                        if (!id) return this.send(`You didn't provide a Discord Bot or User ID`);
                        let body = await this.fetch(`/api/dbl/stats?id=${id}&token=${token}`);
                        if (!body) return this.send(`Unknown error while trying to fetch the image from the API`);
                        return body;
                    }catch(err){
                        return this.send(err.message)
                    }
                },
                post: async (token, id, servers, shards = 0) => {
                    try{
                        if (!token) return this.send(`You didn't provide a Discord Bot List(top.gg) token!`);
                        if (!id) return this.send(`You didn't provide a Discord Bot or User ID`);
                        if (!servers) return this.send(`You didn't provide 'servers' number!`);
                        if (isNaN(servers)) return this.send(`The 'servers' number value isn't valid!`);
                        if (isNaN(shards)) return this.send(`The 'shards' number value isn't valid!`);
                        let body = await this.fetch(`/api/dbl/post?id=${id}&servers=${servers}&shards=${shards}&token=${token}`);
                        if (!body) return this.send(`Unknown error while trying to post the stats to DBL(top.gg)`);
                        if (body.status !== true) return this.send(body.message)
                        return body;
                    }catch(err){
                        return this.send(err.message)
                    }
                }
            },
            photos: async (image) => {
                try{
                    if (!image) return this.send(`You didn't provide an image endpoint, ex: 'cats', 'pugs', 'dogs'`);
                    let body = await this.fetch(`/api/photos/${image}`)
                    if (!body) return this.send(`Unknown error while trying to fetch the image from the API`);
                    return body;
                }catch(err){
                    return this.send(err.message)
                }
            },
            math: async (problem) => {
                try{
                    if (!problem) return this.send(`You didn't provide a math problem`);
                    let body = await this.fetch(`/api/math`, { problem })
                    if (!body) return this.send(`Unknown error while trying to fetch the math problem from the API`);
                    return body;
                }catch(err){
                    return this.send(err.message)
                }
            },
            special: async (image) => {
                try{
                    if (!image) return this.send(`You didn't provide an special endpoint`);
                    let body = await this.fetch(`/api/special?type=${image}`)
                    if (!body) return this.send(`Unknown error while trying to fetch the image from the API`);
                    return body;
                }catch(err){
                    return this.send(err.message)
                }
            },
            translate: async (to, text) => {
                try{
                    if (!to) return this.send(`You didn't provide the 'to' language!`);
                    if (!text) return this.send(`You didn't provide any text!`);
                    let body = await this.fetch(`/api/translate`, { to, text });
                    if (!body) return this.send(`Unknown error while trying to fetch the translation from the API`);
                    return body;
                }catch(err){
                    return this.send(err.message);
                }
            },
            invites: async (type) => {
                try{
                    if (!type) type = "both";
                    let body = await this.fetch(`/api/invites?type=${type.toLowerCase()}`);
                    if (!body) return this.send(`Unknown error while trying to fetch the invites from the API`)
                    return body;
                }catch(err){
                    return this.send(err.message);
                }
            },
            facts: async (type) => {
                try{
                    if (!type) type = "random";
                    let body = await this.fetch(`/api/facts?type=${type.toLowerCase()}`)
                    if (!body) return this.send(`Unknown error while trying to fetch the fact(s) from the API`)
                    return body;
                }catch(err){
                    return this.send(err.message);
                }
            },
            memes: async (clean = false) => {
                try{
                    if (!["true", "false"].includes(clean.toString().toLowerCase())) return this.send(`The 'clean' you provided is invalid, it has to be a boolean.`)
                    let res = await this.fetch(`/api/photos/memes?clean=${clean}`);
                    if (!res) return this.send(`I was unable to fetch the meme :(`);
                    return res;
                }catch(err){
                    return this.send(err.message);
                }
            },
            ball: async () => {
                try{
                    let body = await this.fetch(`/api/8ball`)
                    if (!body) return this.send(`Unknown error while trying to fetch 8ball from the API`)
                    return body;
                }catch(err){
                    return this.send(err.message);
                }
            },
            dogbreed: async (type, breed) => {
                try{
                    if (!type) type = "";
                    if (!breed) breed = "none";
                    let body = await this.fetch(`/api/dogbreed?type=${type}&breed=${breed}`)
                    if (!body) return this.send(`Unable to fetch the dog-breed from the API site!`);
                    return body;
                }catch(err){
                    return this.send(err.message);
                }
            },
            npm: async (name) => {
                try{
                    if (!name) return this.send(`You didn't provide a npm package name!`);
                    let body = await this.fetch(`/api/npm?name=${name}`);
                    if (!body) return this.send(`Unable to fetch the npm package from the API site!`);
                    return body;
                }catch(err){
                    return this.send(err.message);
                }
            },
            time: async (place, all = false) => {
                try{
                    if (typeof all !== "boolean") return this.send(`'all' isn't a boolean!`)
                    if (all === true) {
                        let body = await this.fetch(`/api/time?all=true`);
                        if (!body) return this.send(`Unable to fetch the times list!`);
                        return body;
                    }
                    if (!place) return this.send(`You didn't provide a place!`);
                    let body = await this.fetch(`/api/time?place=${place.toString().toLowerCase()}`);
                    if (!body) return this.send(`Unable to fetch the info for ${place}`);
                    return body;
                }catch(err){
                    return this.send(err.message)
                }
            },
            docs: async (search, project = "stable", branch = "stable") => {
                try{
                    if (!search) return this.send(`Well tell me what you want to search for?`);
                    let body = await this.fetch(`/api/discord.js-docs?search=${search}&project=${project}&branch=${branch}`);
                    if (!body) return this.send(`I was unable to fetch the docs infomration`);
                    return body;
                }catch(err){
                    return this.send(err.message)
                }
            },
            platform: {
                ytstats: async (token, IDOrName) => {
                    try{
                        if (!token) return this.send(`You didn't provide a youtube API key`);
                        if (!IDOrName) return this.send(`You didnt provide a channel ID or name!`);
                        let res = await this.fetch(`/api/platform/yt-stats?user=${IDOrName}&token=${token}`);
                        if (!res) return this.send(`Unable to fetch the ytstats information from the API site`);
                        return res;
                    }catch(err){
                        return this.send(err.message);
                    }
                },
                twitch: async (token, name) => {
                    try{
                        if (!token) return this.send(`You didn't provide a twitch API key`);
                        if (!name) return this.send(`You didnt provide a channel name!`);
                        let res = await this.fetch(`/api/platform/twitch?user=${name}&token=${token}`);
                        if (!res) return this.send(`Unable to fetch the twitch information from the API site`);
                        return res;
                    }catch(err){
                        return this.send(err.message);
                    }
                },
                roblox: async (id) => {
                    try{
                        if (!id) return this.send(`You didn't provide a Discord user ID`);
                        let res = await this.fetch(`/api/platform/roblox?id=${id}`);
                        if (!res) return this.send(`Unable to fetch the roblox information from the API site`);
                        return res;
                    }catch(err){
                        return this.send(err.message);
                    }
                },
                robloxgroup: async (id) => {
                    try{
                        if (!id) return this.send(`You didn't provide a roblox group ID`);
                        let res = await this.fetch(`/api/platform/roblox-group?id=${id}`);
                        if (!res) return this.send(`Unable to fetch the roblox group information from the API site`);
                        return res;
                    }catch(err){
                        return this.send(err.message);
                    }
                },
                fortnite: async (token, name, platform = "pc") => {
                    try{
                        if (!token) return this.send(`You didn't provide a Fortnite API key`);
                        if (!name) return this.send(`You didn't provide a username!`);
                        if (!platform) platform = "pc";
                        let res = await this.fetch(`/api/platform/fortnite?user=${name}&token=${token}&platform=${platform}`);
                        if (!res) return this.send(`Unable to fetch the fortnite information from the API site`);
                        return res;
                    }catch(err){
                        return this.send(err.message);
                    }
                },
                paladins: async (devID, auth, username, platform = "pc") => {
                    try{
                        if (!devID) return this.send(`You didn't provide the 'devID'`);
                        if (!auth) return this.send(`You didn't provide the 'auth'`)
                        if (!username) return this.send(`You didn't provide a username!`);
                        if (!platform) platform = "pc";
                        let res = await this.fetch(`/api/platform/paladins?devID=${devID}&auth=${auth}&platform=${platform}&user=${username}`);
                        if (!res) return this.send(`Nothing found for that user!`);
                        return res;
                    }catch(err){
                        return this.send(err.message);
                    }
                },
                imdb: async (token, show) => {
                    try{
                        if (!token) return this.send(`You didn't provide a 'imdb' API key!`)
                        if (!show) return this.send(`You didn't provide the tv-show or movie name!`);
                        let res = await this.fetch(`/api/platform/imdb?token=${token}&show=${show}`);
                        if (!res) return this.send(`Unable to fetch the imdb information, try again later.`);
                        return res;
                    }catch(err){
                        return this.send(err.message);
                    }
                },
                ytsearch: async (token, name, type = "video") => {
                    try{
                        if (!token) return this.send(`You didn't provide a 'imdb' API key!`)
                        if (!name) return this.send(`You didn't provide the name to search for!`);
                        if (!type) type = "video";
                        let res = await this.fetch(`/api/platform/yt-search?token=${token}&name=${name}&type=${type}`);
                        if (!res) return this.send(`Unable to fetch the ytsearch information, try again later.`);
                        return res;
                    }catch(err){
                        return this.send(err.message);
                    }
                },
                picarto: async (nameOrID) => {
                    try{
                        if (!nameOrID) return this.send(`You didn't provide a Picarto ID or name`);
                        let res = await this.fetch(`/api/platform/picarto?search=${nameOrID}`);
                        if (!res) return this.send(`Unable to fetch the Picarto information, try again later.`);
                        return res;
                    }catch(err){
                        return this.send(err.message);
                    }
                }
            }
        }
    };

    get automod() {
        return {
            images: async (token, urls = [], percent = 89) => {
                try{
                    if (!token) return this.send(`You didn't provide a moderatecontent API Key!`);
                    if (!Array.isArray(urls)) return this.send(`The "urls" you provided wasn't an array!`);
                    if (!urls.length) return this.send(`You didn't provide images to check!`); 
                    let res = await this.fetch(`/api/automod/images?token=${token}&percent=${percent}`, { images: urls });
                    if (!res) return this.send(`Unknown error while trying to fetch the imagemod information from the API`);
                    return res;
                }catch(err){
                    return this.send(err.message);
                }
            },
            words: async (message, words = [], emojis = []) => {
                try{
                    if (!message || message.toString().length === 0) return this.send(`You didn't provide a message`);
                    let res = await this.fetch(`/api/automod/words`, { message, words, emojis });
                    if (!res) return this.send(`I was unable to fetch the API response`);
                    if (res.status !== true) return this.send(res.message);
                    return res;
                }catch(err){
                    return this.send(err.message);
                }
            },
            links: async (message, options = {prefix: null, regexp: true}) => {
                try{
                    if (!message || message.toString().length === 0) return this.send(`You didn't provide a message.`);
                    let res = await this.fetch(`/api/automod/links`, { message, regexp: options.regexp, prefix: options.prefix })
                    if (!res) return this.send(`I was unable to fetch the API response`);
                    if (res.status !== true) return this.send(res.message);
                    return res;
                }catch(err){
                    return this.send(err.message);
                }
            }
        }
    };

    get dev() {
        return {
            blacklists: {
                servers: async (id = "all", type = "list", data = {name: "", reason: "", mod: ""}) => {
                    try{
                        if (!id) return this.send(`You didn't provide a Discord server ID!`);
                        switch(type.toLowerCase()){
                            case "add":
                                let ares = await this.fetch(`/dev/blacklists/servers?id=${id}&action=add&name=${encodeURIComponent(data.name)}&reason=${encodeURIComponent(data.reason)}&mod=${encodeURIComponent(data.mod)}`);
                                if (!ares) return this.send(`I was unable to add the server to the blacklisted database!`);
                                return ares;
                            break;
                            case "delete": case "remove":
                                let dr = await this.fetch(`/dev/blacklists/servers?id=${id}&action=remove&name=${data.name}&reason=${encodeURIComponent(data.reason)}&mod=${encodeURIComponent(data.mod)}`);
                                if (!dr) return this.send(`I was unable to remove the server to the blacklisted database!`);
                                return dr;
                            break;
                            case "list":
                            let ls = await this.fetch(`/dev/blacklists/servers?id=${id}`);
                            if (!ls) return this.send(`I was unable to fetch the blacklisted servers.`);
                            return ls;
                            break;
                        }
                    }catch(err){
                        return this.send(err.message);
                    }
                },
                users: async (id = "all", type = "list", data = {username: "", tag: "", reason: "", mod: ""}) => {
                    try{
                        if (!id) return this.send(`You didn't provide a Discord user ID!`);
                        switch(type.toLowerCase()){
                            case "add":
                                let ur = await this.fetch(`/dev/blacklists/users?id=${id}&action=add&username=${encodeURIComponent(data.username)}&tag=${encodeURIComponent(data.tag)}&reason=${encodeURIComponent(data.reason)}&mod=${encodeURIComponent(data.mod)}`);
                                if (!ur) return this.send(`I was unable to add the user to the blacklisted database!`);
                                return ur;
                            break;
                            case "delete": case "remove":
                                let ed = await this.fetch(`/dev/blacklists/users?id=${id}&action=remove&reason=${encodeURIComponent(data.reason)}&mod=${encodeURIComponent(data.mod)}`);
                                if (!ed) return this.send(`I was unable to remove the user to the blacklisted database!`);
                                return ed;
                            break;
                            case "list":
                            let lu = await this.fetch(`/dev/blacklists/users?id=${id}`);
                            if (!lu) return this.send(`I was unable to fetch the blacklisted users.`);
                            return lu;
                            break;
                        }
                    }catch(err){
                        return this.send(err.message);
                    }
                }
            }
        };
    };

    send(message = "", status = false) {
        return { status, message };
    };
};
