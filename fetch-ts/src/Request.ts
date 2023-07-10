/* eslint-disable no-prototype-builtins */
import http from "http";
import https from "https";
import { join } from "path";
import { stringify } from "querystring";
import { createGunzip, createInflate } from "zlib";
import { Response } from "./Response";
const supportedCompressions = ["gzip", "deflate"];

export class Request {
    public url: URL;
    public method: RequestMethod;
    public data: any;
    private sendDataAs: unknown;
    private reqHeaders: Record<string | number, unknown | number | string>;
    private streamEnabled: boolean;
    private compressionEnabled: boolean;
    private timeoutTime: number | null;
    private coreOptions: Record<string, unknown>;
    private resOptions: Record<string, unknown>;
    public constructor(url: string, method: RequestMethod = "GET") {
        this.url = typeof url === "string" ? new URL(url) : url;
        this.method = method;
        this.data = null;
        this.sendDataAs = null;
        this.reqHeaders = {};
        this.streamEnabled = false;
        this.compressionEnabled = false;
        this.timeoutTime = null;
        this.coreOptions = {};
        this.resOptions = {
            maxBuffer: 50 * 1000000, // 50 MB
        };
        return this;
    }

    query(a1: object | string, a2: string) {
        if (typeof a1 === "object") {
            Object.keys(a1).map((c) =>
                this.url.searchParams.append(c, a1[c as keyof typeof a1])
            );
        } else {
            this.url.searchParams.append(a1, a2);
        }
        return this;
    }

    path(relativePath: string) {
        this.url.pathname = join(this.url.pathname, relativePath);
        return this;
    }

    body(data: unknown, sendAs: string) {
        this.sendDataAs =
            typeof data === "object" && !sendAs && !Buffer.isBuffer(data)
                ? "json"
                : sendAs
                ? sendAs.toLowerCase()
                : "buffer";
        this.data =
            this.sendDataAs === "form"
                ? // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                  // @ts-ignore
                  stringify(data)
                : this.sendDataAs === "json"
                ? JSON.stringify(data)
                : data;
        return this;
    }

    header(a1: object | string, a2: string) {
        if (typeof a1 === "object") {
            for (const name of Object.keys(a1)) {
                this.reqHeaders[name.toLowerCase()] =
                    a1[name as keyof typeof a1];
            }
        } else {
            this.reqHeaders[a1.toLowerCase()] = a2;
        }
        return this;
    }

    timeout(timeout: number) {
        this.timeoutTime = timeout;
        return this;
    }

    option(name: string, value: string) {
        this.coreOptions[name] = value;
        return this;
    }

    stream() {
        this.streamEnabled = true;
        return this;
    }

    compress() {
        this.compressionEnabled = true;
        if (!this.reqHeaders["accept-encoding"]) {
            this.reqHeaders["accept-encoding"] =
                supportedCompressions.join(", ");
        }
        return this;
    }

    send(): Promise<Response> {
        return new Promise((resolve, reject) => {
            if (this.data) {
                if (!this.reqHeaders.hasOwnProperty("content-type")) {
                    if (this.sendDataAs === "json") {
                        this.reqHeaders["content-type"] = "application/json";
                    } else if (this.sendDataAs === "form") {
                        this.reqHeaders["content-type"] =
                            "application/x-www-form-urlencoded";
                    }
                }

                if (!this.reqHeaders.hasOwnProperty("content-length")) {
                    this.reqHeaders["content-length"] = Buffer.byteLength(
                        this.data
                    );
                }
            }

            const options = Object.assign(
                {
                    protocol: this.url.protocol,
                    host: this.url.hostname,
                    port: this.url.port,
                    path:
                        this.url.pathname +
                        (this.url.search === null ? "" : this.url.search),
                    method: this.method,
                    headers: this.reqHeaders,
                },
                this.coreOptions
            );

            let req: any;

            const resHandler = (res: any) => {
                let stream = res;
                let Res: Response;
                if (this.compressionEnabled) {
                    if (res.headers["content-encoding"] === "gzip") {
                        stream = res.pipe(createGunzip());
                    } else if (res.headers["content-encoding"] === "deflate") {
                        stream = res.pipe(createInflate());
                    }
                }

                if (this.streamEnabled) {
                    resolve(stream);
                } else {
                    Res = new Response(res, this.resOptions);
                    stream.on("error", (err: string) => reject(err));
                    stream.on("aborted", () =>
                        reject(new Error("Server aborted request"))
                    );

                    stream.on("data", (chunk: Uint8Array) => {
                        Res._addChunk(chunk);
                        if (this.resOptions.maxBuffer !== null && Res.body) {
                            if (
                                Res.body.length >
                                (this.resOptions.maxBuffer as number)
                            ) {
                                stream.destroy();
                                reject(
                                    `Received a response which was longer than acceptable when buffering. (${this.body.length} bytes)`
                                );
                            }
                        }
                    });
                    stream.on("end", () => resolve(Res));
                }
            };

            if (this.url.protocol === "http:") {
                req = http.request(options as http.RequestOptions, resHandler);
            } else if (this.url.protocol === "https:") {
                req = https.request(
                    options as https.RequestOptions,
                    resHandler
                );
            } else {
                throw new Error(`Bad URL protocol: ${this.url.protocol}`);
            }

            if (this.timeoutTime) {
                req.setTimeout(this.timeoutTime, () => {
                    req.abort();
                    if (!this.streamEnabled)
                        reject(new Error("Timeout reached"));
                });
            }

            req.on("error", (err: string) => reject(err));

            if (this.data) {
                req.write(this.data);
            }

            req.end();
        });
    }
}

export type RequestMethod =
    "GET"
    | "POST"
    | "PATCH"
    | "PUT"
    | "DELETE"
    | "OPTIONS";
