require("moment-duration-format");
const parser = new (require("rss-parser"))();
const moment = require("moment");
const { fetch } = require("@elara-services/fetch");
const { noop, chunk, is, status } = require("@elara-services/basic-utils");

const api = `https://youtube.googleapis.com/youtube/v3`;

exports.time = (date, format = "m", parse = true) => {
  const d = moment.duration(new Date().getTime() - new Date(date).getTime()).format(format);
  if (parse) {
    return parseInt(d.replace(/,/g, ""))
  }
  return d;
}

/**
 * @param {string} id 
 * @returns {Promise<FeedResponse|null>}
 */
exports.fetchFeed = async (id) => {
  return new Promise(r => {
    return parser
      .parseURL(`https://www.youtube.com/feeds/videos.xml?channel_id=${id}`, (err, feed) => {
        if (err) {
          return r(null);
        }
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
  if (!is.array(ids) || !is.string(key)) {
    return null;
  }
  return new Promise(res => {
    let url = fetch(`${api}/videos`)
      .query("key", key)
    for (const id of ids) {
      url.query("id", id);
    }
    for (const p of [
      "snippet",
      "statistics",
      "status",
      "liveStreamingDetails",
      "contentDetails"
    ]) {
      url.query("part", p);
    }
    return url.send().then(r => handle(r, res))
  })
};

/**
 * @param {import("@elara-services/youtube-videos").Video[]} data 
 * @param {*} id 
 * @returns {Promise<import("@elara-services/youtube-videos").Video|null>}
 */
exports.findVideo = (data, id) => {
  if (!is.array(data) || !is.string(id)) {
    return null;
  }
  return data.find(c => c.id === id) ?? null;
}

/**
 * @param {VideoFeed} video 
 * @param {number} minutes 
 * @returns {boolean}
 */
exports.isNew = (video, minutes) => {
  if (!video || !is.number(minutes, false) || !is.number(video.uploadDateMinutes, false)) {
    return false;
  }
  const min = (video.uploadDateMinutes - 15);
  if (min <= 0 || min <= minutes) {
    return true;
  }
  return false;
}

exports.fetchUsers = async (ids = [], key) => {
  if (!is.array(ids) || !is.string(key)) {
    return status.error(`Empty 'ids' or no API key provided.`);
  }
  const all = [];

  const fetchList = async (list = []) => {
    const res = await new Promise((res) => {
      let url = fetch(`${api}/channels`)
        .query("key", key)
        .query("id", list.join(","))
        .query("part", [
          "snippet",
          "statistics",
          "status",
          "contentDetails"
        ].join(","))
      return url.send().then(r => handle(r, res))
    }).catch(noop);
    if (res) {
      all.push(...res);
    }
  }
  for await (const c of chunk(ids, 50)) {
    await fetchList(c);
  }
  if (!is.array(all)) {
    return status.error(`Nothing found for any ids`);
  }

  return {
    /** @type {true} */
    status: true,
    users: all.length,
    /** @type {object[]} */
    results: all,
  };
}

/**
 * 
 * @param {import("@elara-services/fetch").Response} r 
 * @param {Function} res 
 */
function handle(r, res) {
  if (r.statusCode !== 200) {
    return res(null);
  }
  let json = r.json();
  if (!is.array(json?.items)) {
    return res(null);
  }
  return res(json.items);
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