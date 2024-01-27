# Welcome to the cron package
----
# Links:

## [![Docs](https://cdn.discordapp.com/emojis/792291458081095691.png?size=24) Docs](https://elara-services-cron.pages.dev)
## [![Discord](https://cdn.discordapp.com/emojis/847624594717671476.png?size=24) Support](https://discord.gg/qafHJ63 "Support Server") 
## [![Patreon](https://cdn.discordapp.com/emojis/920524344042606695.png?size=24) Patreon](https://patreon.com/elaraservices "Patreon")
## [![PayPal](https://cdn.discordapp.com/emojis/1106809124299214858.png?size=24) PayPal](https://paypal.me/superchiefyt "PayPal")

----

## Getting Started


```js
    const { CronClient } = require("@elara-services/cron");
    const client = new CronClient();
    // By default the timeZone will use `America/Los_Angeles`
    // OR 
    const client = new CronClient("TIMEZONE_HERE"); 
    // To have cron use a certain time to use.
```

### Add Cron Job
```js
    client.add({
        name: "dailyjob", // Name of the job
        time: "1 0 0 * * *", // Every day at midnight
        run: async () => {
            // Code to run when the time comes.
        },
        timeZone: "America/Los_Angeles", // The timeZone to use for this cronjob, otherwise it will use the default one (OPTIONAL)
        onStartup: true, // Run this job instantly (OPTIONAL, DEFAULT: false)
    });
```

### Remove Cron Job
```js
    client.remove("dailyjob"); // Remove the job and stop the process. 
    // Use the name of the cronjob when you created it.
```

### Remove ALL Cron Jobs
```js
    client.removeAll(); // Removes all cron jobs and stops the processes
```

### View Cron Job
```js
    const job = client.get("dailyjob");
    // use 'job' to view it's details etc.
```

### List Cron Jobs
```js
    const jobs = client.list();
    // Returns an array-object of the name and jobs 
```