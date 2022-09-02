const { Duration } = require("@elara-services/packages");
const pack = require("./package.json");

module.exports = class Base {
    /**
     * @param {AutoModDMNotificationsOptions} options 
     */
    constructor(options) {
        this.options = options;
    }

    async handleRun(Intents) {
        let intents = new Intents(this.options.client.options.intents);
        if (!intents.has(2097152)) throw new Error(`You need the "AUTO_MODERATION_EXECUTION" Gateway intent enabled for this to work!`);
        if (!intents.has(32768)) warn(`(NOTE) The content for the user's blocked messages will not display since you don't have the "MESSAGE_CONTENT" Gateway intent added!`)
        if (intents.has(2)) {
            for (const action of this.options.actions) {
                let guild = this.options.client.guilds.resolve(action.guild_id);
                if (!guild) {
                    warn(`I'm not in the following server: ${action.guild_id}, please add the bot to that server to fix this issue then restart the process!`);
                    continue;
                };
                if (!guild.available) {
                    warn(`The following server is unavailable for the bot: ${guild?.name ?? "Unknown Server"} (${action.guild_id})`);
                    continue;
                }
                let hasRole = (action.notify?.role || action.notifications?.role) ? true : false;
                if (action.fetchAllMembers) {
                    if (hasRole) await guild.members.fetch().catch(() => {});
                } else if (hasRole && !intents.has(256)) warn(`For ${guild.name} (${guild.id}) the notify.role or notifications.role members won't get a lot of notifications since you don't have fetchAllMembers enabled or GUILD_PRESENCES intent`)  
            }
        }
        this.options.client.ws.on("AUTO_MODERATION_ACTION_EXECUTION", (data) => this.handleAutoModerationAction(data));
        this.options.client.on("interactionCreate", (i) => this.handleInteractions(i));
    };

    /**
    * @param {object} [options]
    * @param {AutoModerationActions} [options.action]
    * @param {string} [options.type]
    * @param {import("discord.js").GuildMember} [options.member]
    */
    async handleNotifications({ action, type, data, member } = {}) {
        let a = action[type.toLowerCase()] ?? { enabled: false };
        if (a.enabled) {
            if (!a.role && !a.users.length) return;
            if (typeof a.selectmenu === 'undefined') a.selectmenu = true;
            let options = {
                embeds: [
                    {
                        author: { name: member.guild.name, icon_url: member.guild.iconURL() },
                        title: `${type} Alert`,
                        color: 0xFF0000,
                        timestamp: new Date(),
                        fields: [
                            {
                                name: "\u200b",
                                value: [
                                    `User: \`@${member.user.tag}\` (${member.id})`,
                                    data.channel_id ? `Channel: <#${data.channel_id}> (${data.channel_id})` : null
                                ].filter(c => c)
                                    .map(c => `▫️ ${c}`)
                                    .join("\n")
                            }
                        ]
                    }
                ]
            };
            if (type.toLowerCase() === "notify") {
                options.embeds[0].description = (data.content || data.matched_content || "[Unable to provide the user's message content]").slice(0, 4096);
                options.embeds[0].fields.push({ name: "Filtered", value: data.matched_keyword ?? "Unknown?" })
            }

            if (a.role) {
                let role = member.guild.roles.resolve(a.role)
                if (role?.members?.size) {
                    for (const mod of role.members.values()) {
                        if (mod.user.bot) continue;
                        if (a.selectmenu) {
                            let select = this.getSelect(mod, member);
                            if (select) options.components = [{ type: 1, components: [select] }];
                        }
                        mod.send(options).catch(() => null);
                    };
                }
            }

            if (a.users?.length) {
                for (const id of a.users) {
                    let m = await getMember(member.guild, id);
                    if (!m) continue;
                    if (m.user.bot) continue;
                    if (a.selectmenu) {
                        let select = this.getSelect(m, member);
                        if (select) options.components = [{ type: 1, components: [select] }];
                    }
                    m.send(options).catch(() => null);
                }
            }
        };
    };

    /**
     * @private
     * @param {AutoModerationActionExecution} data 
     */
    async handleAutoModerationAction(data) {
        if (data.action?.type !== 1) return;
        let guild = this.options.client.guilds.resolve(data.guild_id);
        if (!guild?.available) return;
        let member = await getMember(guild, data.user_id);
        if (!member) return;
        const action = this.options.actions.find(c => c.guild_id === data.guild_id) || { enabled: false }
        if (!action.enabled) return;
        if (action.ignoreRules?.includes(data.rule_id)) return;
        this.handleNotifications({ action, data, member, type: "Notify" });
        this.handleNotifications({ action, data, member, type: "Notifications" });
    };

    /**
     * @param {import("discord.js").GuildMember} mod 
     * @param {import("discord.js").GuildMember} member 
     * @param {boolean} [addDelete]
     */
    getSelect(mod, member) {
        if (!mod || !member) return null;
        let options = []
        if (member) {
            if (member.permissions.any(1099780063238n)) return null; 
            if (mod.permissions.has(1099511627776n) && member.moderatable && !member.isCommunicationDisabled()) options.push({ label: "Mute", value: `mute:${member.guild.id}:${member.id}`, emoji: { name: "🤫" } })
            if (mod.permissions.has(2n) && member.kickable) options.push({ label: "Kick", value: `kick:${member.guild.id}:${member.id}`, emoji: { name: "👢" } }); 
            if (mod.permissions.has(4n) && member.bannable) options.push({ label: "Ban", value: `ban:${member.guild.id}:${member.id}`, emoji: { name: "🔨" } });
        }
        if (!options.length) return null;
        return {
            custom_id: 'actions',
            placeholder: 'Moderation Actions',
            min_values: 1,
            max_values: 1,
            options,
            type: 3
          }
    };

    /**
     * @param {import("discord.js").GuildMember} member 
     * @param {string} [type]
     * @returns {object}
     */
    getModal(member, type) {
        const modal = { custom_id: ``, title: ``, components: [] }
        const reason = { custom_id: "reason", label: "Reason", style: 2, type: 4, required: true, min_length: 1, max_length: 512 };
        if (type === "mute") {
            modal.custom_id = `mute:${member.guild.id}:${member.id}`;
            modal.title = `Mute: ${member.user.tag}`;
            modal.components = [
                {
                    type: 1,
                    components: [
                        { type: 4, style: 1, value: "10m", required: true, min_length: 2, max_length: 20, label: "Time", custom_id: "time" }
                    ]
                },
                { type: 1, components: [ reason ] }
            ];
            return modal;
        } else if (type === "kick") {
            modal.custom_id = `kick:${member.guild.id}:${member.id}`;
            modal.title = `Kick: ${member.user.tag}`;
            modal.components = [ { type: 1, components: [ reason ] } ]
            return modal;
        } else if (type === "ban") {
            modal.custom_id = `ban:${member.guild.id}:${member.id}`;
            modal.title = `Ban: ${member.user.tag}`;
            modal.components = [
                {
                    type: 1,
                    components: [
                        { type: 4, style: 1, custom_id: "save", label: "Save Messages?", required: false, min_length: 1, max_length: 3, placeholder: "Yes/y to save messages, No/n to delete messages" },
                    ]
                },
                { type: 1, components: [ reason ] }
            ]
            return modal
        }
    };

        /**
     * @private
     * @param {import("discord.js").Interaction} i 
     */
    async handleInteractions(i) {
        const reply = (content, defer = false, ephemeral = true) => {
            if (!i.isRepliable()) return;
            if (defer) {
                if (i.deferred) return;
                return i.deferReply({ ephemeral }).catch(() => {});
            };
            
            if (i.deferred) return i.editReply({ content }).catch(() => {});
            return i.reply({ content, ephemeral }).catch(() => {});
        }
        
        if (i.isSelectMenu()) {
            if (!i.message) return;
            let value = i.values[0];
            let [ type, guildId, id ] = value.split(":");
            let guild = this.options.client.guilds.resolve(guildId);
            if (!guild?.available) return reply(`❌ I was unable to find the server or it's not available.`);
            let member = await getMember(guild, id);
            if (!member) return reply(`❌ I was unable to find that user in the server`)
            switch (type) {
                case "mute": return i.showModal(this.getModal(member, "mute")).catch(console.warn);
                case "kick": return i.showModal(this.getModal(member, "kick")).catch(console.warn);
                case "ban": return i.showModal(this.getModal(member, "ban")).catch(console.warn);
            }
        };

        if (i.isModalSubmit()) {
            if (!i.user) return;
            await reply("", true);
            let [ type, guildId, id ] = i.customId.split(":");
            let guild = this.options.client.guilds.resolve(guildId);
            if (!guild?.available) return reply(`❌ I was unable to find the server or it's not available.`);
            let mod = await getMember(guild, i.user.id);
            if (!mod) return reply(`❌ I was unable to find you in ${guild.name}`);
            let member = await getMember(guild, id);
            if (!member) return reply(`❌ I was unable to find that user in the server`);
            let reason = i.fields.getTextInputValue("reason") || "No Reason Provided";

            switch (type) {
                case "mute": {
                    if (!mod.permissions.has(1099511627776n)) return reply(`❌ You don't have "Moderate Members" permission in ${guild.name}`);
                    if (member.isCommunicationDisabled()) return reply(`❌ Member ${member.user.tag} (${member.id}) is already muted!`);
                    let time = i.fields.getTextInputValue("time");
                    if (!Duration.validate(time)) return reply(`❌ You didn't provide a valid time (ex: 1m, 1h, 1d, 1M)`);
                    return member.timeout(Duration.parse(time), reason)
                    .then(() => reply(`✅ Member ${member.user.tag} (${member.id}) is now muted!`))
                    .catch(e => reply(`❌ Unable to mute ${member.user.tag} (${member.id}) in ${guild.name}\n__Error__\n\`\`\`js\n${e?.message ?? e}\`\`\``));
                };
                case "kick": {
                    if (!mod.permissions.has(2n)) return reply(`❌ You don't have "Kick Members" permission in ${guild.name}`);
                    if (!member.kickable) return reply(`❌ I can't kick ${member.user.tag} (${member.id}) most likely due to them being above me or a permission issue in ${guild.name}`);
                    return member.kick(reason)
                    .then(() => reply(`✅ Member ${member.user.tag} (${member.id}) is now kicked from ${guild.name}!`))
                    .catch(e => reply(`❌ Unable to kick ${member.user.tag} (${member.id}) in ${guild.name}\n__Error__\n\`\`\`js\n${e?.message ?? e}\`\`\``));
                };
                
                case "ban": {
                    if (!mod.permissions.has(4n)) return reply(`❌ You don't have "Ban Members" permission in ${guild.name}`);
                    if (!member.bannable) return reply(`❌ I can't kick ${member.user.tag} (${member.id}) most likely due to them being above me or a permission issue in ${guild.name}`);
                    let save = i.fields.getTextInputValue("save") ?? "n";
                    let shouldSave = [ "yes", "y" ].some(c => save.toLowerCase().includes(c))
                    return member.ban({ reason, days: shouldSave ? undefined : 1, deleteMessageSeconds: shouldSave ? undefined : 43200 })
                    .then(() => reply(`✅ Member ${member.user.tag} (${member.id}) is now banned from ${guild.name}!`))
                    .catch(e => reply(`❌ Unable to ban ${member.user.tag} (${member.id}) in ${guild.name}\n__Error__\n\`\`\`js\n${e?.message ?? e}\`\`\``));
                };
            }
        };
    };
}

/**
 * @typedef {Object} AutoModDMNotificationsOptions
 * @property {import("discord.js").Client} [client] The discord.js client
 * @property {AutoModerationActions[]} [actions] The AutoModerations options
 */

/**
 * @typedef {Object} AutoModerationActions
 * @property {boolean} [enabled] If this should be enabled
 * @property {string} [guild_id] The server ID for this action
 * @property {string[]} [ignoreRules] If the notifications shouldn't go out for these AutoMod rules
 * @property {boolean} [fetchAllMembers] If the package should fetch all members for this guild_id (so notify.role and notifications.role works property)
 * @property {NotifyOptions} [notify] 
 * @property {NotifyOptions} [notifications]
 */

/** 
 * @typedef {Object} NotifyOptions
 * @property {boolean} [enabled] Enable/Disable this action
 * @property {boolean} [selectmenu] If the select menu should be sent in DMs to users/roles in this action
 * @property {string} [role] The role ID you want to be dmed
 * @property {string[]} [users] The user IDs of the users you want to be dmed
 */

/**
 * @typedef {Object} AutoModerationActionExecution
 * @property {string} [guild_id] The id of the guild in which the action was executed
 * @property {object} [action] The action which was executed
 * @property {number} [action.type] the type of action
 * @property {object} [action.metadata] additional metadata needed during execution for this specfic action type
 * @property {string} [action.metadata.channel_id] channel to which user content should be logged
 * @property {number} [action.metadata.duration_seconds] timeout duration in seconds
 * @property {string} [rule_id] the id of the rule which action belongs to
 * @property {number} [rule_trigger_type] the trigger type of the rule which was triggered, (1: KeyWord, 3: SPAM, 4: KeyWord_Preset, 5: Mention Spam)
 * @property {string} [user_id] the id of the user which generated the content which triggered the rule
 * @property {string} [channel_id] the id of the channel in which user content was posted
 * @property {string} [message_id] the id of any user message which content belongs to
 * @property {string} [alert_system_message_id] the id of any system auto moderation messages posted as a result of this action
 * @property {string} [content] the user generated text content
 * @property {string} [matched_keyword] the word or pharse configured in the rule that triggered the rule 
 * @property {string} [matched_content] the substring in content that triggered the rule
 */



const warn = (...args) => console.warn(`[${pack.name}, v${pack.version}]: `, ...args);

/**
 * @param {import("discord.js").Guild} guild 
 * @param {string} id 
 * @returns {Promise<import("discord.js").GuildMember>}
 */
const getMember = async (guild, id) => guild.members.resolve(id) || await guild.members.fetch({ user: id }).catch(() => null) || null