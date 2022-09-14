const status = (message) => ({ status: false, message });
const fetch = require("@elara-services/fetch");
module.exports = class Google {
  constructor(key, cx) {
    this.key = key;
    this.cx = cx;
  };
  async search(search, safeMode = false) {
    try {
      if (!search) return status(`You didn't provide any thing to search for.`);
      if (!this.key) return status(`YOu didn't provide an API key.`);
      if (!this.cx) return status(`YOu didn't provide a CX ID.`);
      if (typeof safeMode !== "boolean") safeMode = false;
      let r = await fetch(`https://www.googleapis.com/customsearch/v1`)
        .query({
          key: this.key,
          cx: this.cx,
          q: encodeURIComponent(search),
          safe: safeMode ? "off" : "on"
        })
        .send()
        .catch(() => ({ statusCode: 500 }));
      
      if (r.statusCode !== 200) return status(`I was unable to find a search for that.`);
      let json = r.json();
      if (!Array.isArray(json?.items) || !json.items.length) return status(`Nothing found for that.`);
      return {
        status: true,
        res: json,
        links: json.items.map(c => c.link)
      }
    } catch (err) {
      return status(err.message);
    }
  }
};