# Getting Started

```js
const { YouTubeVideos } = require("@elara-services/youtube-videos"),
        youtube = new YouTubeVideos();
```

## Add Creators
```js
// Adding a single creator     
youtube.creators.add("UCzEnk4KWFlSj_PjXLz0"); // Adds the channelID to the 'data' set


// Bulk adding creators
youtube.creators.bulk([
    "UCzEnk4KWFlSj_PjXLz0",
    "UC....",
    "UC.....", 
]);
// Adds all of the channelIDs to the 'data' set.
```

## Remove Creator
```js
youtube.creators.remove("UCzEnk4KWFlSj_PjXLz0"); // Remove the channelID from the 'data' set
```

## List Creators
```js
youtube.creators.list(); // Returns an array of channelIDs
```

## Set Interval/Search Minutes
```js
youtube.setSearch(1); // The interval will be 1 minute
// DEFAULT: 2 minutes
```

## Listen to video announcements
```js
youtube.listen("video", async (channelID, videos) => {
    // Code to do whatever when a new video is found. 
    // channelID: the creator's channelID
    // videos: The array of videos found for the user.
});
```

## Listen to searching creators for videos
```js
youtube.listen("searching", async (channels) => {
    // Code to do whatever when this event gets triggered. 
    // Channels: the array of creator channelIDs
});
```


## Start the process
```js
youtube.run();
```


## Get More Information for videos

```js
const { util: { fetchVideos } } = require("@elara-services/youtube-videos");

// `[ ... ]` provide the video IDs in an array!
const videos = await fetchVideos([ ... ], "YOUTUBE_API_KEY");
// Array of videos found

```