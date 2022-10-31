# Getting Started
> The default run times for searching is: 
> Users: 1 minute
> Subreddits: 2 minutes
> To change the run time use: `.setSearch(<number>, 'users')` or `.setSearch(<number>, 'subs')`

```js
const { Reddit } = require("@elara-services/reddit"),
        reddit = new Reddit();
```

## Adding Subreddit
```js
reddit.subs.add("aww"); // Adds a single subreddit to be searched for. 
// OPTIONAL: reddit.subs.add("...", true); // To skip the validator that makes sure the reddit sub exists

reddit.subs.bulk([
    "aww",
    "discordapp",
]); // Adds multiple subs to be searched for. 
// OPTIONAL: reddit.users.bulk([ ... ], true); // To skip the validator that makes sure the reddit sub exists
```

## Removing Subreddit
```js
reddit.subs.remove("aww"); // Removes a single sub from the search list. 
// OPTIONAL: reddit.subs.remove("...", true); // To skip the validator that makes sure the reddit sub exists
```

## List Subreddits
```js
reddit.subs.list(); // Returns an array of the subs in the search list. 
```



## Adding Users

```js
reddit.users.add("SUPERCHIEFYT"); // Adds a single user to be searched for. 
// OPTIONAL: reddit.users.add("...", true); // To skip the validator that makes sure the reddit user exists

reddit.users.bulk([
    "SUPERCHIEFYT",
    "Reddit",
]); // Adds multiple users to be searched for. 
// OPTIONAL: reddit.users.bulk([ ... ], true); // To skip the validator that makes sure the reddit user exists
```

## Removing User
```js
reddit.users.remove("SUPERCHIEFYT"); // Removes a single user from the search list. 
// OPTIONAL: reddit.users.remove("...", true); // To skip the validator that makes sure the reddit user exists
```

## List Users
```js
reddit.users.list(); // Returns an array of the users in the search list. 
```

## Listen to new posts for users 
```js
reddit.listen("user", async (user, post) => {
    // Code to execute when a new post happens for the user.
});
```

## Listen to new posts for subreddits
```js
reddit.listen("subreddit", async (sub, post) => {
    // Code to execute when a new post happens for the sub.
});
```

## Listen to 'searching' for subs and users
```js
reddit.listen("searching", (list, type) => {
    // Code to execute when searching for that type. Also returns the list of users/subs that is being searched. 
});
```


## Toggle users/subs searching
```js
// Users
reddit.setEnabled(true, 'users'); // To enable users to be searched.
reddit.setEnabled(false, 'users'); // To disable users from being searched.

// Subs
reddit.setEnabled(true, 'users'); // To enable subs to be searched.
reddit.setEnabled(false, 'subs'); // To disable subs from being searched.
```

## Toggle the minute(s) until search
```js
// Users
reddit.setSearch(1, 'users'); // This will set it to 1 minute per-user search. 

// Subs
reddit.setSearch(1, 'subs'); // This will set it to 1 minute per-sub search.
```