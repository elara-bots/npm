const fetch = require("@elara-services/fetch");

class Twitch {
    /**
     * @param {string} clientId 
     * @param {string} clientSecret 
     */
    constructor(clientId, clientSecret) {
        if (!clientId || !clientSecret) throw new Error(`You failed to provide the clientId or clientSecret`);
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.bearer = { token: null, expire: 0 };
    };
    
    /**
     * @private
     * @returns {string|null}
     */
    async _generateBearerToken() {
        const url = new URL('https://id.twitch.tv/oauth2/token');
        url.searchParams.append('client_secret', this.clientSecret);
        url.searchParams.append('client_id', this.clientId);
        url.searchParams.append('grant_type', 'client_credentials');
        const response = (await fetch(url.href, "POST").send()).json();
        this.bearer.token = response.access_token;
        this.bearer.expire = Date.now() + (response.expires_in * 1000);
        return response.access_token;
    };

    /**
     * @private
     * @returns {string|null}
     */
    async getToken() {
        if (!this.bearer.token || (Date.now() < this.bearer.expire)) await this._generateBearerToken();
        return this.bearer.token;
    };

    /**
     * @param {string} url 
     * @param {string} method 
     * @returns {Promise<object|null>}
     */
    async makeRequest(url, method = "GET") {
        let token = await this.getToken();
        if (!token) return null;
        let res = await fetch(url, method)
        .header({
            "Authorization": `Bearer ${token}`,
            "Client-Id": this.clientId
        })
        .send()
        .catch(() => ({ statusCode: 500 }));
        if (res.statusCode !== 200) return null;
        return res.json();
    };

    /**
     * @param {string|Array<string>} idsOrNames
     * @returns {Promise<object|null>}
     */
    async user(idsOrNames) {
        if (typeof idsOrNames === "string") idsOrNames = [ idsOrNames ];
        if (!Array.isArray(idsOrNames) || !idsOrNames.length) return { status: false, message: `You didn't provide an array of ids or names` };
        const url = new URL(`https://api.twitch.tv/helix/users`);
        for (const idOrName of idsOrNames) {
            if (isNaN(parseInt(idOrName))) url.searchParams.append("login", idOrName);
            else url.searchParams.append("id", idOrName);
        };
        let res = await this.makeRequest(url.href);
        if (!res) return { status: false, message: `The request gave back no data.` }
        if (!Array.isArray(res.data) || !res.data.length) return { status: false, message: `There was no one found.` }
        return { status: true, data: res.data || [] };
    };

    /**
     * @param {string|Array<string>} idsOrNames - User IDs or Logins (123456 or 'tfue')
     * @returns {Promise<object|null>}
     */
    async stream(idsOrNames) {
        if (typeof idsOrNames === "string") idsOrNames = [ idsOrNames ];
        if (!Array.isArray(idsOrNames) || !idsOrNames.length) return { status: false, message: `You didn't provide an array of ids or names` };
        const url = new URL(`https://api.twitch.tv/helix/streams`);
        for (const idOrName of idsOrNames) {
            if (isNaN(parseInt(idOrName))) url.searchParams.append("user_login", idOrName);
            else url.searchParams.append("user_id", idOrName);
        };
        let res = await this.makeRequest(url.href);
        if (!res) return { status: false, message: `The request gave back no data.` }
        if (!Array.isArray(res.data) || !res.data.length) return { status: false, message: `There was no one found.` }
        return { status: true, data: res.data || [] };
    };

    async fetchAll(idsOrNames) {
        let [ users, streams ] = await Promise.all([ this.user(idsOrNames), this.stream(idsOrNames) ]);
        if (!users.status && !streams.status) return { status: false, message: `No users or streams match ${idsOrNames}` }; 
        return { status: true, users: users?.data ?? [], streams: streams?.data ?? [] }
    };
};

exports.Twitch = Twitch;