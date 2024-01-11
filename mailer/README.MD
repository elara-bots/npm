# Welcome to the `@elara-services/mailer` package! 
This package allows you to send an SMS message or email via a Gmail account!

## Getting Started
- You need to get the accessToken and refreshToken from your Google Cloud Platform account: [Guide here](https://www.freecodecamp.org/news/use-nodemailer-to-send-emails-from-your-node-js-server/)


```js
    const { Mailer } = require("@elara-services/mailer");
    const mail = new Mailer("example@gmail.com", {
        username: `Elara Services: Mailer`, // Your custom name for who sent the email (NOTE: It will show your gmail account to the user you send stuff to!)
        accessToken: "Your gmail access token",
        refreshToken: "Your gmail refresh token"
    });
```


### Send SMS: 
```js
    mail.phone("PHONE_NUMBER", "Text message here");
    // By default: It will use 'us' as the region 
    // By default: it will go through all of the carriers/providers to find the correct one to send it to if you don't provide a carrier when using the 'phone' function!
```

### Send Email(s):
```js
    mail.email("boop@example.com", {
        text: `Boop!`, // Optional
        subject: `Henlo!`, // Optional 
        html: `<html><body><h1>Beep!</h1></body></html>`, // Optional 
    });
    // NOTE: "text" or "html" is required! (one or the other has to be provided in order to work properly)

    // Send the same info to multiple emails: 
    mail.email([
        "foo@example.com",
        "bar@example.com",
        "...etc"
    ], {
        text: `Boop!`, // Optional
        subject: `Henlo!`, // Optional 
        html: `<html><body><h1>Beep!</h1></body></html>`, // Optional 
    });
```