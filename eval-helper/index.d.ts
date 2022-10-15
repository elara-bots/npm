declare module "@elara-services/eval-helper" { 
    export interface EvalOptions {
        /** 'code' is required if there is no 'attachment' option provided */
        code?: string;
        /** 'attachment' is required if there is no 'code' option provided, supports: js, txt */
        attachment?: string;
        /** If the response should handle async */
        async?: boolean;
    }
    export function getCode(options: EvalOptions): Promise<any>;
    export function handlePromise(code: Promise | object): Promise<any>;
    export function clean(code: string | any, censors: string[]): Promise<any>;
}