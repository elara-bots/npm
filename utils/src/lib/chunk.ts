export function chunk(arr: unknown[], size: number): unknown[] {
    let array: unknown[] = [];
    for (let i = 0; i < arr.length; i += size) {
        array.push(arr.slice(i, i + size));
    }
    return array;
}