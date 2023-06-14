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