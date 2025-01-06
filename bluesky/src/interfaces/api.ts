import { BskyAgent } from "@atproto/api";
import { Common } from ".";

export interface APIOptions extends Common {
    defaultService?: string;
}

export interface FeedOptions {
    limit?: number;
    filter?: string;
    checkAgainstTime?: number;
    agent?: BskyAgent;
}
