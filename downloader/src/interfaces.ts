import type { RequestOptions } from "http";

export type Options = Pick<RequestOptions, 'headers' | 'auth' | 'agent' | 'timeout' | 'maxHeaderSize'> & {


    /**
     * The file name to use, by default it will extract the file name
     */
    name?: string;

    /**
     * THe file path to use
     */
    path?: string;

    /**
     * Boolean indicating whether the image filename will be automatically extracted
     * from `url` or not. Set to `false` to have `options.path` without a
     * file extension for example.
     * @default true
     */
    extractFilename?: boolean;

    /**
     * The maximum number of allowed redirects; if exceeded, an error will be emitted.
     * @default 21
     */
    maxRedirects?: number;
  }
