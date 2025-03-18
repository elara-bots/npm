export const is = {
    string: (name: any, checkEmpty = true): name is string => {
        if (typeof name === "string") {
            if (checkEmpty && !name) {
                return false;
            }
            return true;
        }
        return false;
    },

    number: (num: any, checkEmpty = true): num is number => {
        if (typeof num === "number" && !isNaN(num)) {
            if (checkEmpty && num <= 0) {
                return false;
            }
            return true;
        }
        return false;
    },

    boolean: (bool: any): bool is boolean => {
        return typeof bool === "boolean";
    },

    array: <T>(arr: T[] | unknown, checkEmpty = true): arr is T[] => {
        if (Array.isArray(arr)) {
            if (checkEmpty && !arr.length) {
                return false;
            }
            return true;
        }
        return false;
    },

    object: (obj: any, checkEmpty = false): obj is object => {
        if (obj === null) {
            // If the 'obj' is null it will return 'true' for th typeof check below. So this check is needed. (JS is dumb sometimes)
            return false;
        }
        const isObject = typeof obj === "object";
        if (isObject && checkEmpty === true) {
            if (!Object.keys(obj).length) {
                return false;
            }
        }
        return isObject;
    },

    error: (err: any): err is Error => {
        return err instanceof Error;
    },

    undefined: (und: any): und is undefined => {
        return typeof und === "undefined" || und === undefined;
    },

    null: (name: any): name is null => {
        return name === null;
    },
    promise: (promise: any): promise is Promise<any> => {
        return promise instanceof Promise;
    },

    func: (thing: any): thing is () => unknown => {
        return typeof thing === "function";
    },

    buffer: (thing: any): thing is Buffer => {
        return thing instanceof Buffer;
    }
};

export function getPluralTxt(arrOrNum: unknown[] | number): "" | "s" {
    if (is.array(arrOrNum)) {
        if (arrOrNum.length >= 2) {
            return "s";
        }
    } else if (is.number(arrOrNum)) {
        if (arrOrNum >= 2) {
            return "s";
        }
    }
    return "";
}
