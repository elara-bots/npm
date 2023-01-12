require("moment-duration-format");
const parser = new (require("rss-parser"))();
const moment = require("moment");
const fetch = require("@elara-services/fetch");

exports.time = (date, format = "m", parse = true) => {
  const d = moment.duration(new Date().getTime() - new Date(date).getTime()).format(format);
  if (parse) return parseInt(d.replace(/,/g, ""))
  return d;
}

/**
 * @param {string} id 
 * @returns {Promise<FeedResponse|null>}
 */
exports.fetchFeed = async (id) => {
  return new Promise(r => {
    return parser.parseURL(`https://www.youtube.com/feeds/videos.xml?channel_id=${id}`, (err, feed) => {
      if (err) return r(null);
      return r({
        channel: { name: feed.title, url: feed.link },
        videos: feed.items.map(c => ({
          id: c.id.replace(/yt:video:/g, ""),
          url: c.link,
          title: c.title,
          uploadDate: c.isoDate,
          uploadDateFormat: exports.time(c.isoDate, "d[d], h[h], m[m], s[s]", false),
          uploadDateMinutes: exports.time(c.isoDate)
        }))
      })
    })
  })
};

exports.fetchVideos = async (ids = [], key) => {
    if (!ids?.length || !key) return null;
    return new Promise(res => {
        let url = fetch(`https://youtube.googleapis.com/youtube/v3/videos`)
        .query("key", key)
        for (const id of ids) url.query("id", id);
        for (const p of [
            "snippet",
            "statistics",
            "status",
            "liveStreamingDetails",
            "contentDetails"
        ]) url.query("part", p);
        return url.send()
        .then(r => {
          if (r.statusCode !== 200) return res(null);
          let json = r.json();
          if (!json?.items?.length) return res(null);
          return res(json.items);
        })
    })
};

/**
 * @param {import("@elara-services/youtube-videos").Video[]} data 
 * @param {*} id 
 * @returns {Promise<import("@elara-services/youtube-videos").Video|null>}
 */
exports.findVideo = (data, id) => {
  if (!data?.length || !id) return null;
  return data.find(c => c.id === id) ?? null;
}

/**
 * @param {VideoFeed} video 
 * @param {number} minutes 
 * @returns {boolean}
 */
exports.isNew = (video, minutes) => {
  if (!video || typeof minutes !== "number" || typeof video.uploadDateMinutes !== "number") return false;
  const min = (video.uploadDateMinutes - 15);
  if (min <= 0 || min <= minutes) return true;
  return false;
}

/**
 * @typedef {Object} FeedResponse
 * @property {object} channel
 * @property {string} channel.name 
 * @property {string} channel.url
 * @property {VideoFeed[]} videos
 */

/**
 * @typedef {Object} VideoFeed
 * @property {string} id
 * @property {string} url
 * @property {string} title
 * @property {string} uploadDate
 * @property {string} uploadDateFormat
 * @property {number} uploadDateMinutes
 */