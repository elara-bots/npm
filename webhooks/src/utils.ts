import { log as LOG, getPackageStart } from "@elara-services/utils";
import { name, version } from "../package.json";

export function log(...args: unknown[]) {
    return void LOG(`${getPackageStart({ name, version })}: `, ...args);
}
export function throwError(str: string) {
    throw new Error(`${getPackageStart({ name, version })}: ${str}`)
}

export const bannedUsernames = {
    includes: [
        "discord", "clyde", "@", "#", ":", "```"
    ],
    equals: [
        `everyone`, `here`
    ]
}