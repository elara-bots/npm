declare module "@elara-services/google-search" {

    export interface Status {
        status: boolean,
        message: string;
    };

    export interface GoogleResponse {
        status: boolean,
        res: object,
        links: string[]
    }

    class Google {
        public constructor(key: string, cx: string);
        public cs: string;
        public key: string;
        public search(search: string, safeMode?: boolean): Promise<Status | GoogleResponse>;
    }

    // @ts-ignore
    export = Google;
}