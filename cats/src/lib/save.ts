import { files, getKeys, is, make } from "@elara-services/basic-utils";
import { fetch } from "@elara-services/fetch";
import { mkdirSync, readdirSync } from "fs";
import { DownloadResult, image } from "image-downloader";
import moment from "moment";
import { join } from "path";

export class RedditSave {
    /**
     * Path needs to be the absolute path to the folder.
     */
    public constructor(private path?: string) {}

    public setPath(path: string) {
        this.path = path;
        return this;
    }

    #redditURL(id: string, sub?: string) {
        return id.match(/https?:\/\//gi)
            ? id
            : `https://reddit.com/r/${sub || "cats"}/comments/${id}`;
    }

    public async fetchMultiple(urls: string[]) {
        const results = make.array<string>();
        for await (const url of urls) {
            try {
                const r = await this.fetch(
                    this.#validate(this.#redditURL(url))
                );
                if (r) {
                    results.push(r);
                }
            // eslint-disable-next-line no-empty
            } catch {

            }
        }
        return results;
    }

    public async fetch(url: string) {
        const uri = this.#makeURL(`/info`, {
            url: this.#validate(this.#redditURL(url)),
        });
        const r = await fetch(uri)
            .send()
            .catch(() => {});
        if (!r || r.statusCode !== 200) {
            return null;
        }
        return this.#makeURL(
            `/download.php`,
            {
                permalink: r
                    .text()
                    .split(
                        `href="https://sd.rapidsave.com/download.php?permalink=`
                    )?.[1]
                    ?.split('">')?.[0],
            },
            "sd"
        );
    }

    public async download(urls: string[]) {
        if (!this.path) {
            throw new Error(
                `No 'path' provided in the constructor or with <${this.constructor.name}>.setPath function`
            );
        }
        await files.dir.create(this.path);
        const results = make.array<{ url: string, response: DownloadResult }>();
        let i = 0;
        for await (const url of urls) {
            const f = await this.fetch(url);
            if (f) {
                i++;
                const r = await image({ url: f, dest: this.getPath(i) }).catch(
                    (e) => new Error(e)
                );
                if (r instanceof Error || !r.filename) {
                    i--;
                    continue;
                }
                results.push({ url, response: r });
            }
        }
        return results;
    }

    public getPath(days = 1, ext = "mp4") {
        let currentMonth = moment().daysInMonth();
        const path = (m: moment.Moment, ending?: string) =>
            `${this.path}/${m.toDate().getFullYear()}/${m.format("MMMM")}${
                ending || ""
            }`;
        const getLatest = (m: moment.Moment) => {
            mkdirSync(path(m), { recursive: true });
            const co = parseInt(
                readdirSync(path(m))
                    .map((c) => c.split(".")[0])
                    .sort((a, b) => parseInt(b) - parseInt(a))[0]
            );
            if (isNaN(co)) {
                return Math.floor(parseInt(m.format("D")));
            }
            return Math.floor(co + 1);
        };
        let month = moment().add(days, "days");
        let next = getLatest(month);
        if (next > currentMonth) {
            month = moment().startOf("month").add(1, "month");
            currentMonth = month.daysInMonth();
            next = getLatest(month);
            if (next > currentMonth) {
                while (next > currentMonth) {
                    month = month.add(1, "month");
                    currentMonth = month.daysInMonth();
                    next = getLatest(month);
                }
            }
        }
        return join(path(month, `/${next}.${ext}`));
    }

    #validate(url: string) {
        if (!is.string(url) || !url.match(/https?:\/\/(old.|www.)?reddit.com\//gi)) {
            throw new Error(`URL provided isn't a Reddit url`);
        }
        return url.replace("old.reddit.com", "www.reddit.com");
    }

    #makeURL(ext: string, query?: Record<string, string>, subdomain?: string) {
        const ending = make.array<string>();
        if (is.object(query)) {
            for (const key of getKeys(query)) {
                if (query[key]) {
                    ending.push(`${key}=${query[key]}`);
                }
            }
        }
        return `https://${subdomain ? `${subdomain}.` : ""}rapidsave.com${ext}${
            is.array(ending) ? `?${ending.join("&")}` : ""
        }`;
    }
}
