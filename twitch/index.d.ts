declare module "@elara-services/twitch" {


    export interface UserData {
        broadcaster_type: 'partner' | 'affiliate' | string;
        description: string;
        display_name: string;
        id: string;
        login: string;
        offline_image_url: string;
        profile_image_url: string;
        type: 'staff' | 'admin' | 'global_mod' | string;
        view_count: number;
        created_at: string;
    }

    export interface StreamData {
        id: string;
        user_id: string;
        user_login: string;
        user_name: string;
        game_id: string;
        game_name: string;
        type: 'live' | string;
        title: string;
        viewer_count: number;
        started_at: string;
        language: string;
        thumbnail_url: string;
        tag_ids: string;
        is_mature: boolean;
    }

    export class Twitch {
        public constructor(clientId: string, clientSecret: string);
        private clientId: string;
        private clientSecret: string;
        private bearer: { token: string | null, expire: number };
        private _generateBearerToken(): Promise<void>;
        private getToken(): Promise<string | null>;
        public makeRequest(url: string, method?: string): Promise<object | null>;
        public user(idsOrNames: string | string[]): Promise<{ status: boolean, message?: string, data?: UserData[] }>;
        public stream(idsOrNames: string | string[]): Promise<{ status: boolean, message?: string, data?: StreamData[] }>;

    }
}