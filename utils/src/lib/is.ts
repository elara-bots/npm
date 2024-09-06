import { make } from "./utils";

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

    object: (obj: any): obj is object => {
        return typeof obj === "object";
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

/**
 * @deprecated
 * @description Use make.array()
 */
export function makeArray<T>(arr?: T[]): T[] {
    return make.array<T>(arr);
}

export function noop() {
    return null;
}
