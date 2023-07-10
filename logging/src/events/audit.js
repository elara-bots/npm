const { AuditLogEvent } = require("discord-api-types/v10");

module.exports = class AuditLogs extends require("./base") {
    constructor(client) {
        super(client, {
            name: "GUILD_AUDIT_LOG_ENTRY_CREATE",
            emitter: "ws"
        })
        this.dontStore = [
            AuditLogEvent.WebhookCreate,
            AuditLogEvent.WebhookDelete,
            AuditLogEvent.WebhookUpdate,
            AuditLogEvent.MessagePin,
            AuditLogEvent.MessageUnpin,
            AuditLogEvent.IntegrationCreate,
            AuditLogEvent.IntegrationDelete,
            AuditLogEvent.IntegrationUpdate,
            AuditLogEvent.AutoModerationBlockMessage,
            AuditLogEvent.AutoModerationFlagToChannel,
        ];
    }

    /**
     * @param {AuditLogEntry} data 
     */
    async run(data) {
        if (this.logger && !this.dontStore.includes(data.action_type)) this.logger.auditCache.set(data.id, data);
        

        switch (data.action_type) {
            case AuditLogEvent.WebhookCreate: {
                break;
            }
        }
    }
}

/**
 * @typedef {Object} AuditLogEntry
 * @property {string} user_id
 * @property {string} target_id
 * @property {string} id
 * @property {string} guild_id
 * @property {number} action_type
 * @property {object} [options]
 * @property {{ key: string, new_value: any, old_value?: any }[]} changes
*/