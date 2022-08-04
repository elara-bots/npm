const sendError = (msg) => {return {status: false, message: msg}};
module.exports = class Google{
  constructor(key, cx){ 
  this.key = key;
  this.cx = cx;
  };
  async search(search, safeMode = false){
    try{
    if(!search) return sendError(`You didn't provide anything to search for!`);
    if(!this.key) return sendError(`You didn't provide an api key!`);
    if(!this.cx) return sendError(`You didn't provide an CX ID!`);
    if(typeof safeMode !== "boolean") safeMode = false;
    let {get} = require('superagent');
    let res = await get(`https://www.googleapis.com/customsearch/v1?key=${this.key}&q=${encodeURIComponent(search)}&cx=${this.cx}&safe=${safeMode ? "off": "active"}`);
    if(res.status === 200){
      if(!res.body) return sendError(`I was unable to fetch the information.`);
      let links = [];
      if(!Array.isArray(res.body.items)) return sendError(`Nothing for that... :(`);
      if(res.body.items.length === 0) return sendError(`Nothing for that. :(`)
      for await (const i of res.body.items){
        links.push(i.link);
      };
      return {status: true, res: res.body, links: links};
    }else{
      return sendError(`I was unable to find a search for that.`);
    }
  }catch(err){
    return sendError(err.message);
  }
  }
};