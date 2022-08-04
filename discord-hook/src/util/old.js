const {validateURL, resolveColor, emptyEmbed, limits, error} = require("./util")

module.exports = class Webhook{
  constructor(url){
    if(validateURL(url) === false) return error(`The "url" provided was empty, not a string or wasn't discord.com/discordapp.com url`);
    this.webhook = url;
    this.embed = emptyEmbed;
    this.request = {
      "content": "",
      "embeds": [this.embed],
      "avatar_url": "",
      "username": ""
    }
  };
  /**
   * @param {string} id 
   */
  setMention(id){
    if(!id) return this;
    if(typeof id !== "string") return this;
    if(!(id.startsWith("<@") && id.endsWith(">"))) return this;
    this.request.content = `${id}${this.request.content ? `, ${this.request.content}` : ""}`;
    return this;
  };
  /**
   * @param {string} title 
   */
  setTitle(title){
    if(!title || typeof title !== "string") return this;
    if(title.length > limits.title) title = title.slice(0, limits.title);
    this.embed.title = title;
    return this;
  };
  /**
   * @param {string} description
   * @description - Max length: 2048, if it goes over the max length then the description will be shorten down. 
   */
  setDescription(description){
    if(!description || typeof description !== "string") return this;
    if(description.length > limits.description) description = description.slice(0, limits.description);
    this.embed.description = description;
    return this;
  };
  /**
   * @param {string} name The field name
   * @param {string} value The field value
   * @param {boolean} inline if the field should be inline
   */
  addField(name = "", value = "", inline = false){
    if(this.embed.fields.length > 25 || (name === "" && value === "")) return this;
    if(name.length > limits.fields.name) name = name.slice(0, limits.fields.name);
    if(name.length > limits.fields.value) value = value.slice(0, limits.fields.value);
    this.embed.fields.push({ name, value, inline });
    return this;
  };
  /**
   * @param {boolean} inline 
   */
  addBlankField(inline = false){
    return this.addField(`\u200b`, `\u200b`, inline);
  };
  /**
   * @param {string} content 
   */
  setContent(content){
    if(!content || typeof content !== "string") return this;
    if(content.length > limits.content) content = content.slice(0, limits.content);
    this.request.content = this.request.content += content;
    return this;
  };
  /**
   * @param {Date|string|undefined} date 
   */
  setTimestamp(date){
    if(date){
      let d = new Date(date);
      if(!d || d === "Invalid Date") d = new Date();
      this.embed.timestamp = d;
    }else{
      this.embed.timestamp = new Date();
    }
    return this;
  };
  /**
   * @param {string} name 
   * @param {string} icon 
   * @param {string} url 
   */
  setAuthor(name, icon, url){
    if(name) this.embed.author.name = name;
    if(icon) this.embed.author.icon_url = icon;
    if(url) this.embed.author.url = url;
    return this;
  };
  /**
   * @param {string} name 
   * @param {string} icon 
   */
  setFooter(name, icon){
    if(name) this.embed.footer.text = name;
    if(icon) this.embed.footer.icon_url = icon;
    return this;
  };
  /**
   * @param {string} name 
   */
  setUsername(name){
    if(!name) return this;
    if(typeof name !== "string") return this;
    if(name.length < 1) return this;
    if(name.length > limits.username) name = name.slice(0, limits.username);
    this.request.username = name;
    return this;
  };
  /**
   * @param {string} url 
   */
  setAvatar(url){
    if(url) this.request.avatar_url = url;
    return this;
  };
  /**
   * @param {string} url 
   */
  setImage(url){
    if(url) this.embed.image.url = url;
    return this;
  };
  /**
   * @param {string} url 
   */
  setThumbnail(url){
    if(url) this.embed.thumbnail.url = url;
    return this;
  };
  setColor(color){
      if(color) this.embed.color = resolveColor(color);
      return this;
  };
  setColour(colour){ return this.setColor(colour);};
  setURL(url){
    if(url) this.embed.url = url;
    return this;
  };
  /**
   * @param {string} title 
   * @param {string} url 
   */
  addTitle(title, url){
    this.setTitle(title).setURL(url);
    return this;
  };
  async send(){
    let res = new (require("../index"))(this.webhook)
    return await res
    .username(this.request.username)
    .icon(this.request.avatar_url)
    .embeds(this.request.embeds)
    .content(this.request.content)
    .send()
  }
}
