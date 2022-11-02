const { EventEmitter } = require("events");
exports.util = require("./util");

exports.YouTubeVideos = class YouTubeVideos {
    constructor() {
        this.emiiter = new EventEmitter();
        this.data = new Set();
        this.interval = 2;
    };

    /**
     * @param {number} minutes 
     * @returns {YouTubeVideos}
     */
    setSearch(minutes) {
        if (typeof minutes !== "number") throw new Error(`'minutes' isn't a number!`);
        this.interval = minutes;
        return this;
    };

    /**
     * @param {'video' | 'searching'} event 
     * @param {Function} listener 
     * @returns {YouTubeVideos}
     */
    listen(event, listener) {
        if ([ "video", "searching" ].includes(event.toLowerCase())) this.emiiter.on(event.toLowerCase(), listener);
        return this;
    };

    get creators() {
        return {
            add: (channelId) => {
                if (!channelId) return this;
                if (!this.data.has(channelId)) this.data.add(channelId);
                return this;
            },
            remove: (channelId) => {
                if (!channelId) return this;
                if (this.data.has(channelId)) this.data.delete(channelId);
                return this;
            },
            list: () => [ ...this.data.values() ],

            bulk: (channels) => {
                for (const channelId of channels) this.data.add(channelId);
                return this;
            }
        }
    };

    async run() {
        const timer = () => setTimeout(() => this.run(), this.interval * 60000);
        if (!this.data.size) return timer();
        this.emiiter.emit("searching", this.creators.list());
        for await (const id of this.creators.list()) {
            const creator = await exports.util.fetchFeed(id);
            if (!creator) continue;
            const videos = creator.videos.filter(c => exports.util.isNew(c, this.interval));
            if (!videos?.length) continue;
            this.emiiter.emit("video", id, videos);
        };
        return timer();
    };
};