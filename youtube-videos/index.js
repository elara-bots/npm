const { is } = require("@elara-services/basic-utils");
const { EventEmitter } = require("events");
exports.util = require("./util");

exports.YouTubeVideos = class YouTubeVideos {
    constructor() {
        this.emiiter = new EventEmitter();
        this.data = new Set();
        this.announced = new Set();
        this.interval = 2;
    };

    /**
     * @param {number} minutes 
     * @returns {YouTubeVideos}
     */
    setSearch(minutes) {
        if (!is.number(minutes)) {
            throw new Error(`'minutes' isn't a number!`);
        }
        this.interval = minutes;
        return this;
    };

    /**
     * @param {'video' | 'searching'} event 
     * @param {Function} listener 
     * @returns {YouTubeVideos}
     */
    listen(event, listener) {
        if (["video", "searching"].includes(event.toLowerCase())) {
            this.emiiter.on(event.toLowerCase(), listener);
        }
        return this;
    };

    get creators() {
        return {
            add: (channelId) => {
                if (!is.string(channelId)) {
                    return this;
                }
                if (!this.data.has(channelId)) {
                    this.data.add(channelId);
                }
                return this;
            },
            remove: (channelId) => {
                if (!is.string(channelId)) {
                    return this;
                }
                if (this.data.has(channelId)) {
                    this.data.delete(channelId);
                }
                return this;
            },
            list: () => [...this.data.values()],

            bulk: (channels) => {
                for (const channelId of channels) {
                    this.data.add(channelId);
                }
                return this;
            }
        }
    };

    async run() {
        const timer = () => setTimeout(() => this.run(), this.interval * 60000);
        if (!this.data.size) {
            return timer();
        }
        this.emiiter.emit("searching", this.creators.list());
        for (const id of this.creators.list()) {
            const creator = await exports.util.fetchFeed(id);
            if (!creator) {
                continue;
            }
            const videos = creator.videos.filter(c => exports.util.isNew(c, this.interval) && !this.announced.has(c.id));
            if (!is.array(videos)) { 
                continue; 
            }
            this.emiiter.emit("video", id, videos);
            for (const v of videos) {
                this.announced.add(v.id);
            }
        };
        return timer();
    };
};