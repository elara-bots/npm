import { is } from "./is";

export function getNearest(n: number, maxNumber = 1000) {
    if (n < 0) {
        return 0;
    }
    return Math.ceil(n / maxNumber) * maxNumber;
}

export function getAverage(arr: number[]) {
    return Math.floor(arr.reduce((a, b) => a + b) / arr.length);
}

/**
 * @description Fuck you Apple
 */
export function convertiOSShit(str: string) {
    return str.replace(/’/g, "'").replace(/“|”/g, '"');
}

export function getRandom<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)] as T;
}
export function getRandomValue(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function formatNumber(num: string | number | unknown[], showInfinitySymbol = false) {
    if (is.array(num, false)) {
        num = num.length;
    }
    if (showInfinitySymbol && num === Infinity) {
        return "∞";
    }
    return num.toLocaleString();
}

export function hasBit(bitfield: number, bit: number) {
    if ((bitfield & bit) === bit) {
        return true;
    }
    return false;
}
