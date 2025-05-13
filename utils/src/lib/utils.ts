import { is } from "@elara-services/basic-utils";

export function commands(content: string, prefix: string) {
    if (!is.string(content)) {
        return {
            name: "",
            args: [],
            hasPrefix() {
                return false;
            },
            isCommand() {
                return false;
            },
        };
    }
    const str = content?.split(/ +/g) || "";
    const name = str[0].slice(prefix.length).toLowerCase();
    return {
        name,
        args: str.slice(1),
        hasPrefix() {
            if (content.toLowerCase().startsWith(prefix)) {
                return true;
            }
            return false;
        },
        isCommand(commandName: string) {
            if (commandName === name) {
                return true;
            }
            return false;
        },
    };
}

export function getClientIdFromToken(token: string) {
    return Buffer.from(token.split(".")[0], "base64").toString();
}
