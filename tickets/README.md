# Elara Services: Tickets

This is a customizable ticket system that uses interactions and discord.js


# Getting Started
```js
const { Client } = require("discord.js"),
        Tickets = require(`@elara-services/tickets`),
        client = new Client({ intents: ["GUILDS"] }),
        tickets = new Tickets({
            client,
            prefix: "support", // This is what is used for interactions (buttons) and the start of the channel name
            encryptToken: "ASB!@#$%^&*(B", // This is to encrypt/decrypt the user IDs in the channel topic, to avoid non-staff from seeing who's ticket it is
            debug: true, // Only use if you want errors logged.
            appeals: { // OPTIONAL
                enabled: true, // If the appeals server checks should be enabled.
                mainserver: {
                    id: "", // The main server's id 
                    checkIfBanned: true // Check if the user is banned in the main server, if not they can't open a ticket.
                },
                embeds: {
                    not_banned: {} // The embeds, content and components for the not banned message. 
                }
            },

            modal: {
                enabled: true, // If this form should be enabled  / shown 
                title: "", // The top title of the modal / form 
                questions: [
                    {
                        label: "[NAME]", // The name of this question
                        style: 2, // 1 (SHORT ANSWER) | 2 (LONG ANSWER)
                        placeholder: "", // The placeholder of the question
                        value: "", // The default value for the question
                        required: true, // If the question should be required
                        min_length: 20, // The min length for the question response
                        max_length: 4000, // The max length for the question response
                    }
                ]
            },
            webhook: {
                id: "", // 'webhookId' support will be removed in the next major version
                token: "", // 'webhookToken' support will be removed in the next major version
                username: "Webhook Username Here", // 'webhookUsername' support will be removed in the next major version
                avatar: "", // 'webhookAvatar' support will be removed in the next major version
            },
            support: {
                canOnlyCloseTickets: true, // If 'true' only roles and users listed below can close tickets. (OR people with 'Manage Server' permission)
                roles: [ // 'supportRoleIds' support will be removed in the next major version
                    "123456789"
                ],
                users: [ // 'supportUserIds' support will be removed in the next major version
                    "123456789"
                ]
            },
            ticket: {
                closeReason: true, // This will enforce users or support staff to provide a reason for closing the ticket
                limitOnePerUser: true, // This will block users from creating more than one ticket.
                category: "", // When tickets get created they get created in this category, (OPTIONAL) - Default is the category ID for the starter message's channel.
                open: {
                    content: "", // The content of the ticket message once it gets created, use "%user%" or "%server%" for the user mention or server name
                    embeds: [], // View https://discord.com/developers/docs/resources/channel#embed-object 
                }
            }
    })

client.on("interactionCreate", (int) => tickets.run(int))

client.on("ready", () => {
    console.log(`Client is ready`);
    // Use it as "node bot.js --starter" or just create a command in your bot to manage the starter message
    if (process.argv.find(c => c === "--starter")) {
        return tickets.starterMessage(`HELP OR SUPPORT CHANNEL ID HERE`, {
            embeds: [
                { title: "Support Tickets", description: `Click the button below to create a support ticket!`, color: 0xFF000 }
            ]
        })
    }
});

client.login("BOT TOKEN HERE")
```