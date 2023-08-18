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
            appeals: { // [OPTIONAL]
                enabled: true, // If the appeals server checks should be enabled.
                mainserver: {
                    id: "", // The main server's id 
                    checkIfBanned: true // Check if the user is banned in the main server, if not they can't open a ticket.
                },
                embeds: {
                    not_banned: {
                        content: "",
                        embeds: [], // View https://discord.com/developers/docs/resources/channel#embed-object 
                        components: [] // View https://discord.com/developers/docs/interactions/message-components#what-is-a-component
                    } // The embeds, content and components for the not banned message. 
                }
            },

            modal: { // [OPTIONAL]
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
            webhook: { // [OPTIONAL]
                id: "", // The webhook ID for this ticket's open and closed logs. 
                token: "", // The webhook Token for this ticket's open and closed logs.
                username: "Webhook Username Here", // The webhook username for this ticket's logs.
                avatar: "", // The webhook avatar for this ticket's logs.
            },
            support: { // [OPTIONAL]
                canOnlyCloseTickets: true, // If 'true' only roles and users listed below can close tickets. (OR people with 'Manage Server' permission)
                roles: [ // The role ids for the 'support' members
                    "123456789"
                ],
                users: [ // The user ids for the 'support' users
                    "123456789"
                ]
            },
            ticket: { // [OPTIONAL]
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


## Want to have a select menu instead of button(s)?
> Just use `<Ticket>.prefix` for the select menu option value
```js
{
    "custom_id": "....", // This can be anything.
    "max_values": 1,
    "min_values": 1,
    "placeholder": "Select a ticket type below",
    "options": [
        { "label": "Support", "value": supportTicket.prefix, "description": "Open an Support ticket for x, y, z." },
        { "label": "Moderator", "value": modTicket.prefix, "description": "Open an Moderator ticket for x, y, z." },
        // etc.
        // Just make sure you use `<Ticket>.prefix` for the value of the option.
    ]
}
```

# Want to make the bot / responses be in a certain lagnauge? 
Make a PR request with the language you would like to see in [elara-bots/npm](https://github.com/elara-bots/npm) GitHub repo
- Copy the contents of `./languages/en-US.js`