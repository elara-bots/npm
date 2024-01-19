# Welcome to the `@elara-services/mailer` package! 
This package allows you to send an SMS message or email via a Gmail account!

## Getting Started
- You need to get the clientId, clientSecret and refreshToken from your Google Cloud Platform account: [Guide here](https://www.freecodecamp.org/news/use-nodemailer-to-send-emails-from-your-node-js-server/)
- MAKE SURE TO ENABLE THE `GMAIL API` SERVICE ON YOUR GOOGLE CLOUD ACCOUNT! 


```js
const { Mailer } = require("@elara-services/mailer");
const mail = new Mailer("example@gmail.com", {
    username: `Elara Services: Mailer`, // Your custom name for who sent the email (NOTE: It will show your gmail account to the user you send stuff to!)
    clientId: "Your google apis client ID",
    clientSecret: "Your google apis client secret",
    refreshToken: "Your gmail refresh token",
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


# Server API

## Getting Started
```js
const { Server } = require("@elara-services/mailer");
const server = new Server({
    email: "your_gmail_account@gmail.com",
    options: {
        username: "Elara Services: Mailer",
        clientId: "your_client_id",
        clientSecret: "your_client_secret",
        refreshToken: "your_refresh_token",
    }
}, "API_KEY_HERE", 2020);
// "API_KEY_HERE" make sure to make the key secure! 
// Replace 2020 with whatever you want the API's port number to be! 
server.start(); // Make the server start listening for requests. 
```
------------------------------------------
### Authorization: 
1) You need the `Authorization` header for all routes. (If you have the API key provided)

------------------------------------------
## Send Endpoints: 

### Route: `/email`
Body: 
```json
{
    "email": "xxx",
    "subject": "Email Subject (OPTIONAL)",
    "text": "Text for the email",
    "html": "HTML code for the email (Use 'html' or 'text')"
}
```

### Route: `/sms`
Body: 
```json
{
    "phone": "xxx",
    "text": "Text for the message"
}
```
--------------

## Verification Endpoints: 

### Route: `/verify/sms`
Body: 
```json
{
    "phone": "123456789",
    "codeLength": 20, // Verification code length. (OPTIONAL, DEFAULT: 15)
}
```

### Route: `/verify/email`
Body: 
```json
{
    "email": "xxxx",
    "codeLength": 20, // Verification code length. (OPTIONAL, DEFAULT: 15)
}
```
### Verification Responses: 
Success: 
```json
{
    "status": true,
    "code": "xxx"
}
```

 Fail: 
```json
{
    "status": false,
    "message": "xxx"
}
```