import { Request, type RequestMethod } from "./Request";

export function fetch(url: string, method: RequestMethod = "GET") {
    return new Request(url, method);
}
export * from "./Request";
export * from "./Response";