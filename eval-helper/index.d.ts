declare module "@elara-services/eval-helper" { 
    export interface EvalOptions {
        /** 'code' is required if there is no 'attachment' option provided */
        code?: string;
        /** 'attachment' is required if there is no 'code' option provided, supports: js, txt */
        attachment?: string;
        /** If the response should handle async */
        async?: boolean;
        /** If the response has any strings listed it will be changed to `[X]` */
        sensor?: string[];
    }
    export function handle(options: EvalOptions): Promise<any>;
}