# Threads.net Announcements/Posts

- This package will let you know when someone posts on threads.net. 
- Allows you to track multiple users at once. 
- Has an automatic defaultAnnouncements for Discord webhooks. 


## Getting Started
```js

const { Client } = require(`@elara-services/threads`);
const client = new Client({
    defaultAnnouncements: true,
    debug: true, // Only if you want debug logged.
    interval: 3 * 60000, // Check all of the users every 3 minutes. (WARNING, I wouldn't go under 2 minutes.)
    // The default interval is: every 3 minutes.
});
```

## Add a user
```js
client.addUser({
    name: "the_name_for_the_user", // Their name all lowercase username. 
    id: "the_id_for_the_user", // Their user ID, use `client.fetchUser` or `client.bulkFetchUserIds` to get multiple user IDs.
    webhooks: [ // Only required if you want the package to automatically announce new thread posts
        "https://discord.com/api/webhooks/.../...",
    ],
    full_name: "Their Display Username", // Optional 
    color: 0, // The color for the embed(s)
    ignoreText: [ // What is the text you want to ignore, if it's in the thread post.
        "#boop"
    ],
    useLinkButton: true, // If the package should use a link button for the user's thread post url. (ONLY WORKS FOR WEBHOOKS CREATED BY DISCORD BOTS/APPLICATIONS)
});
```

## Add multiple users.
```js
client.addUsers([
    {
        name: "the_name_for_the_user", // Their name all lowercase username. 
        id: "the_id_for_the_user", // Their user ID, use `client.fetchUser` or `client.bulkFetchUserIds` to get multiple user IDs.
        webhooks: [ // Only required if you want the package to automatically announce new thread posts
            "https://discord.com/api/webhooks/.../...",
        ],
        full_name: "Their Display Username", // Optional 
        color: 0, // The color for the embed(s)
        ignoreText: [ // What is the text you want to ignore, if it's in the thread post.
            "#boop"
        ],
        useLinkButton: true, // If the package should use a link button for the user's thread post url. (ONLY WORKS FOR WEBHOOKS CREATED BY DISCORD BOTS/APPLICATIONS)
    },
    {
        ...etc,
    }
]);
```

## Start listening for new posts.
```js
client.onPost(async (user, post, raw) => {
    // Whatever code you want to run after a new post is found for the user.
});
```

## Run the process for everything
```js
client.run();
```

## Formatted User 
```js
{
    username: string, // The user's username.
    id: string | number, // The user's ID 
    avatar: string, // The image url for the user.
    verified: boolean, // If the account is verified with Meta.
    following: number, // The amount of users the user is following.
    followers: number, // The amount of users the user has following. 
}
```

## Formatted Post
```js
{
    replies: number, // The total replies of the post. 
    likes: number, // The post likes count. 
    created: {
        iso: string, // The ISOTimestamp for when the post was created.
        unix: number, // The unix timestamp for when the post was created.
    },
    content: string | null, // The content of the post (string or null)
    id: string, // The post ID 
    code: string, // The post code to view the post.
    images: string[], // The image urls found in the post (an array of strings)
    videos: string[], // The video urls found in the post (an array of strings) 
    url: string, // The threads.net post URL.
    user: object | null, // For the formatted user object
    posts: {
        quoted: object | null, // Formatted post of the quoted thread post. (object or null)
        reposted: object | null, // Formatted post of the reposted thread post. (object or null)
        repliedTo: string | null, // The user that got replied to. (string or null)
    }
};
```