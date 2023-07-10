export function bool(s: boolean | unknown, def = true) {
    return typeof s === "boolean" ? s : def;
};

export function num(number: number | string) {
    return number.toLocaleString();
};

export function status(message: string, status: boolean = false) {
    return { status, message };
};