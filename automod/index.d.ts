declare module "@elara-services/automod" {
    export type Response = {
        status: boolean,
        message?: string
    };
    export function words(message: string, words?: string[], emojis?: []): Response & { filtered?: string[] };
    export function links(message: string, regex?: boolean, prefix?: string): Response & { links?: string[] };
    export function nitro(content: string): boolean;
    export async function images(options: { urls: string[], percent?: number, key: string }): Response & { images?: string[], full?: string[], processed?: string[] }; 
};