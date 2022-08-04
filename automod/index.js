const status = (data = {}, status = false) => ({ status, ...data });
const { fetch } = require("@elara-services/packages");
module.exports = class AutoMod extends null {
    static words(message = "", words = [], emojis = []) {
        try{
            if(!message) return status({ message: "Nothing provided.", filtered: [] });
            let word = [];
            if(words?.length){
                for (const msg of message.toString().split(/\s+/g)) {
                    if(words.includes(msg.toLowerCase()) && !word.includes(msg.toLowerCase())) word.push(msg);
                }
            }
            if(emojis?.length){
                for (const emoji of emojis) if(message.toString().includes(emoji) && !word.includes(emoji)) word.push(emoji);
            }
            if(word.length) return status({ filtered: word }, true);
            return status({ message: `Nothing found`, filtered: [] });
        }catch(err){
            return status({ message: err.message, filtered: [] })
        };
    };

    static links(message = "", regex = true, prefix = "") {
        let response = (s = false, message = "") => status({ message, links: message }, s);
        try{
            if(!message) return status({ message: `No message` });
            if(typeof regex !== "boolean") regex = true;
            const ins = (c = []) => {
                let there = [];
                for (const g of c) if(message.toLowerCase().includes(g.toLowerCase())) there.push(true);
                return there.length === 0 ? false : true
            }; 
            if(!regex){
                if(!ins(["http://", "https://", "www.", ".com"])) return response();
                if((message.toLowerCase().includes(".com") && prefix === ".") || message.toLowerCase().includes(".com") && message.toLowerCase().includes(".command") === true) return response();
            }else{
                if(/(https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]+\.[^\s]{2,}|www\.[a-zA-Z0-9]+\.[^\s]{2,})/gi.test(message) === false) return response();
            };
            return response(true, true);
        }catch(err){
            return response();
        };
    };

    static async images({ urls = [], percent = 89, key = "" } = {}) {
        if(!key) return status({ message: `No ImageKey provided` });
        try{
            if(!percent) percent = 89;
            let [ imgs, processed ] = [ [], [] ];
            for await (const url of urls){
                let res = await fetch(`https://api.moderatecontent.com/moderate/?key=${key}&url=${url}`);
                if (!res || res.error_code !== 0) continue;
                processed.push(res);
                if(res.predictions.adult >= parseInt(percent)) imgs.push({ percent: res.predictions.adult, url, raw: res });
            };
            if(!imgs.length) return status({ images: [], full: [], processed }, false);
            return status({ images: imgs.map(c => c.url), full: imgs, processed }, true);
        }catch(err){
            return status({ message: err.message }, false);
        };
    };

    static nitro(content = "") {
        if(!content || typeof content !== "string") return false;
        if(
            content.match(/https?:\/\//gi) && 
            [ 
                "nitro", "this gift is", "who is first", 
                "catch this gift", "whо is first", "take it guys" 
            ].some(c => content.toLowerCase().includes(c)) && 
            ![ 
                "discord.com/", "discord.gift/", 
                "tenor.com/", "giphy.com/" 
            ].some(c => content.toLowerCase().includes(c))
        ) return true;
        return false;
    };
};