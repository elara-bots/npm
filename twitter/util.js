/** @type {import("twitter-api-v2").Tweetv2FieldsParams} */
module.exports.tweets = {
    "expansions": [
        "attachments.media_keys",
        "attachments.poll_ids",
        "author_id",
        "edit_history_tweet_ids",
        "entities.mentions.username",
        "geo.place_id",
        "in_reply_to_user_id",
        "referenced_tweets.id",
        "referenced_tweets.id.author_id"
    ],
    "tweet.fields": [
        "attachments",
        "author_id",
        "context_annotations",
        "conversation_id",
        "created_at",
        "entities",
        "geo",
        "id",
        "in_reply_to_user_id",
        "lang",
        "text",
        "source",
        "reply_settings",
        "referenced_tweets",
        "public_metrics",
        "promoted_metrics",
        "possibly_sensitive",
        "organic_metrics",
        "withheld"
    ],
    "media.fields": [
        "alt_text",
        "duration_ms",
        "height",
        "media_key",
        "non_public_metrics",
        "organic_metrics",
        "preview_image_url",
        "public_metrics",
        "type",
        "url",
        "variants",
        "width"
    ],
    "poll.fields": [
        "duration_minutes",
        "end_datetime",
        "id",
        "options",
        "voting_status"
    ],
    "user.fields": [
        "created_at",
        "description",
        "entities",
        "id",
        "location",
        "name",
        "pinned_tweet_id",
        "profile_image_url",
        "protected",
        "public_metrics",
        "url",
        "username",
        "verified",
        "verified_type",
        "withheld"
    ]
};

/** @type {Omit<import("twitter-api-v2").UsersV2Params, "media.fields" | "poll.fields" | "tweet.fields">} */
module.exports.user = {
    expansions: [ "pinned_tweet_id" ],
    "user.fields": module.exports.tweets['user.fields']
}

module.exports.chunk = (s = [], c = 10) => {
    let R = [];
    for (var i = 0; i < s.length; i += c) R.push(s.slice(i, i + c));
    return R;
}

module.exports.isArray = (arr, checkIfEmpty = true) => {
    if (checkIfEmpty && Array.isArray(arr) && arr.length) return true;
    if (Array.isArray(arr)) return true;
    return false; 
}


module.exports.bool = (i, def = false) => typeof i === 'boolean' ? i : def;


module.exports.WSEvents = {
    "START": "stream:start",
    "POST": "stream:post",
    "RECONNECT": "stream:reconnect",
    "ERROR": "stream:error",
    "DEBUG": "stream:debug",
    "RAW": "stream:raw",
    "DISCONNECT": "stream:disconnect",
}

module.exports.isEqual = (one = "", two = "") => one.toLowerCase() === two.toLowerCase();