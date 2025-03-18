import { is } from "./is";

export function getAllBrackets(str: string, removeBrackets?: boolean) {
    return (
        str.match(/\{.*?\}/g)?.map((c) => {
            if (removeBrackets === true) {
                return c.replace("{", "").replace("}", "").trim();
            }
            return c.trim();
        }) || []
    );
}

export function removeAllBrackets(str: string) {
    const brackets = getAllBrackets(str);
    if (!is.array(brackets)) {
        return str.trim();
    }
    for (const b of brackets) {
        str = str.replace(new RegExp(b, "gi"), "");
    }
    return str.trim();
}
