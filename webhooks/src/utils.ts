import { name, version } from "../package.json";
const prefix = `[${name}, v${version}]: `;

export function log(...args: unknown[]) {
    return void console.log(prefix, ...args);
}
export function throwError(str: string) {
    throw new Error(`${prefix}${str}`)
}

export const bannedUsernames = {
    includes: [
        "discord", "clyde", "@", "#", ":", "```"
    ],
    equals: [
        `everyone`, `here`
    ]
}