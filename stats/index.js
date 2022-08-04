const { fetch } = require("@elara-services/packages");

exports.Stats = class Stats {
    constructor(url, id, key){
        this.url = url;
        this.id = id;
        this.key = key;
    }
    commands({ guildID, name } = {}){
        this.client("commands");
        if (guildID && name) this.guild({ guildID, name });
        return null;
    }

    audit(guildID) {
        if (!guildID) return null;
        return this.post(`${this.url}/guilds/id/${guildID}/${this.id}/audit`);
    }

    event(event) {
        if (!event) return null;
        return this.post(`${this.url}/clients/id/${this.id}/events`, { event })
    }

    starts() { return this.client("starts") }
    restarts() { return this.client("restarts") }
    vote() { return this.client("votes") }
    shutdowns() { return this.client("shutdowns") }
    events(guild = null) { return guild ? this.post(`${this.url}/guilds/id/${guild}/${this.id}/events`) : null; }
    webhooks() { return this.client(`webhooks`) }
    messages(guildId){ return this.post(`${this.url}/guilds/id/${guildId}/${this.id}/messages`) }
    guilds(join = true) { return this.client(`guilds.${join === true ? "joins" : "leaves"}`) }
    
    client(type = "") { return this.post(`${this.url}/client/id/${this.id}?type=${type.toLowerCase()}`) }
    
    async guild(options = { guildID: "", name: "" }){
        let r = await this.post(`${this.url}/guilds/id/${options.guildID}/${this.id}?name=${options.name.toLowerCase()}`)
        if (!r) return null;
        if (r.status !== true) {
            if (r.message === "I was unable to find that database."){
                let rb = await this.get(`${this.url}/guilds/id/${options.guildID}/${this.id}/create`);
                if (rb?.status) return this.guild(options);
                return r;
            }else return r;
        }
        return r;
    }

    getClient(id = null) { return this.get(`${this.url}/client/id/${id ? id : this.id}`); }
    getGuild(guildID, clientID){ return this.get(`${this.url}/guilds/id/${guildID}/${clientID}`); }
    getClients(){ return this.get(`${this.url}/client/all`); }
    
    async getGuilds(clientId = null){
        let res = await this.get(`${this.url}/guilds/all`);
        if (!res?.status) return null;
        return clientId ? { status: true, data: res.data.filter(c => c.clientID === clientId) } : res;  
    }

    post(url, body = undefined){
        try {
            return fetch(url, this.key, body, true)
        } catch {
            return null;
        }
    }
    
    get(url){
        try {
            return fetch(url, this.key);
        } catch {
            return null;
        }
    }
};