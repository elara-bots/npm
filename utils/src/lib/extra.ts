export function sleep(timeout?: number) {
    return new Promise(r => setTimeout(r, timeout));
};

export function chunk<T extends unknown>(arr: T[], size: number): T[][] {
    let array: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
        array.push(arr.slice(i, i + size));
    }
    return array;
}

export function commands(content: string, prefix: string) {
    const str = content.split(/ +/g);
    const name = str[0].slice(prefix.length).toLowerCase();
    return {
        name, args: str.slice(1),
        hasPrefix() {
            if (content.toLowerCase().startsWith(prefix)) {
                return true;
            }
            return false;
        },
        isCommand(commandName: string){
            if (commandName === name) {
                return true;
            }
            return false;
        }
    }
};