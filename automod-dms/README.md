# About
This package will DM (Direct Message) the members in the notify.role or notifications.role for the action on that server or user IDs in the notify.users or notifications.users arrays.

### **NOTE: This works along side Discord's built-in AutoMod system**

----

# **Getting Started**
### **NOTE: For this to work you need to have `Block Message` option enabled in the Discord built-in AutoMod filter!**
> This package supports both discord.js v13 and v14 

```js
const { AutoModDMNotifications } = require("@elara-services/automod-dms");

const automod = new AutoModDMNotifications({
    client, // Your discord.js Client 
    actions: [ // An array of actions for the bot to watch for. 
        {
            enabled: true, // If this action should be enabled
            guild_id: "12345678", // The server ID for this action only.
            ignoreRules: [ // To ignore a certain AutoMod rule from being sent to notify/notification users
                "2133456", 
            ],
            fetchAllMembers: true, // If you want the package to automatically fetch all members for the provided server ID (REQUIRES: 'GUILD_MEMBERS' intent)
            notify: { // People in this option will get the user's message content or what got filtered. 
                enabled: true, // If the notify role/users should be notified
                selectmenu: true, // If the "Moderation Actions" select menu should be sent in DMs to the notify.role members or notify.users people 
                role: "2134567", // The notify role ID, anyone in this role will get DM Notify Alerts
                users: [ // The user IDs for anyone you want to get the DM Notify Alerts
                    "21345678"
                ]
            },
            notifications: { // People in this option will not get the user's message content or what got filtered. 
                enabled: true, // If the notifications role/users should be notified
                selectmenu: true, // If the "Moderation Actions" select menu should be sent in DMs to the notifications.role members or notifications.users people 
                role: "2134567", // The notifications role ID, anyone in this role will get DM Notifications Alerts
                users: [ // The user IDs for anyone you want to get the DM Notifications Alerts
                    "21345678"
                ]
            },
        }
    ]
})

client.once("ready", () => {
    automod.run();
    // This will start the automod process. 
})
```