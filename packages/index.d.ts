declare module "@elara-services/packages" {
    type array = string[];

    export class AES {
        public constructor(key: string);
        private key: string;
        private header: string;
        public encrypt(input: string): string
        public decrypt(encrypted: string): string;
    }

    export const Languages: {
        find(name: string): string | null;
        langs: object
    }

    export class Minesweeper {
        public constructor(options?: {
            rows?: number;
            columns?: number;
            mines?: number;
            emote?: string
        });

        public rows: number;
        public columns: number;
        public mines: number;
        public matrix: array;
        public types: {
            mine: string;
            numbers: array
        };

        public generateEmptyMatrix(): void;
        public plantMines(): void;
        public getNumberOfMines(x: number, y: number): string;
        public start(): string | array[] | null;
    }

    export class Interactions extends null {
        public static button(options: ButtonOptions): Button;
        public static select(options: SelectOptions): Select;
        public static modal(options: ModalOptions): Modal;
        public static textInput(options: TextInputOptions, row?: boolean): TextInput | { type: number, components: [ TextInput ] };
    }

    export type ChannelTypes = 'GUILD_TEXT' | 'DM' | 'GUILD_VOICE' | 'GROUP_DM' | 'GUILD_CATEGORY' | 'GUILD_NEWS' | 'GUILD_STORE' | 'GUILD_NEWS_THREAD' | 'GUILD_PUBLIC_THREAD' | 'GUILD_PRIVATE_THREAD' | 'GUILD_STAGE_VOICE';

    export type TextInputOptions = {
        id?: string;
        type?: number;
        title?: string;
        style?: number;
        min?: number;
        max?: number;
        holder?: string;
    } & TextInput;

    export type TextInput = {
        custom_id?: string;
        type?: number;
        label?: string;
        style?: number;
        min_length?: number;
        max_length?: number;
        placeholder?: string;
        value?: string;
        required?: boolean;
    }

    export type SlashOptions = {
        type: number;
        name: string;
        description: string;
        required?: boolean;
        channel_types?: ChannelTypes[];
        autocomplete?: boolean;
        min_value?: number;
        max_value?: number;
        min_length?: number;
        max_length?: number;
        choices?: { name: string, value: string }[];
        options?: SlashOptions[];
        locale?: {
            names?: object;
            descriptions?: object;
        }
    }

    export type Slash = {
        type?: number;

        dmPermission?: boolean;
        dm_permission?: boolean;

        defaultMemberPermissions?: string;
        default_member_permissions?: string;
        
        options?: SlashOptions[];
        locale?: {
            names?: object;
            descriptions?: object;
        }
    }

    export class SlashBuilder {

        public static TEXT_BASED_CHANNELS: number[];

        public static types: {
            sub_command: number,
            sub_group: number,
            string: number,
            integer: number,
            boolean: number,
            user: number,
            channel: number,
            role: number,
            mentionable: number,
            number: number,
            context: {
                user: number;
                message: number;
            }
        };

        public static context: {
            user(name: string, options?: Omit<Slash, "options"|"type">): Slash;
            message(name: string, options?: Omit<Slash, "options"|"type">): Slash;
        };

        public static choice(name: string, value: string|number, name_localizations?: object): { name: string, value: string|number, name_localizations: object };
        public static option(data: SlashOptions): Slash;
        public static create(name: string, description: string, options: Slash): Slash;
    }

    export type Button = {
        custom_id?: string;
        label?: string;
        type?: number;
        style?: number;
        disabled?: boolean;
        emoji?: { name?: string, id?: string, animated?: boolean };
        url?: string
    }

    export type ButtonOptions = {
        id?: Button['custom_id'];
        title?: Button['label'];
        label?: Button['label'];
        custom_id?: Button['custom_id'];
        type?: Button['type'];
        style?: ButtonStyles | Button['style'];
        disabled?: Button['disabled'];
        emoji?: Button['emoji'];
        url?: Button['url']
    }

    export type ButtonStyles = 'PRIMARY' | 'BLURPLE' | 'SECONDARY' | 'GREY' | 'SUCCESS' | 'GREEN' | 'DANGER' | 'RED' | 'LINK' | 'URL'

    export type Select = {
        custom_id: string;
        placeholder: string;
        min_values: number;
        max_values: number;
        type: number;
        options: {
            label: string;
            value: string;
            description?: string;
            emoji?: Button['emoji'],
            default?: boolean;
        }[]
    }

    export type SelectOptions = {
        id?: Select['custom_id'];
        custom_id?: Select['custom_id'];
        holder?: Select['placeholder'];
        min?: Select['min_values'];
        max?: Select['max_values'];
        type?: Select['type'];
        options: Select['options']
    }

    export type Modal = {
        title: string;
        custom_id: string;
        components: {
            type: number,
            components: {
                type: number;
                custom_id: string;
                label: string;
                style: 1 | 2 | number;
                min_length?: number;
                max_length?: number;
                required?: boolean;
                value?: string;
                placeholder?: string;
            }[]
        }[]
    }

    export type ModalOptions = {
        id?: Modal['custom_id'];
        custom_id?: Modal['custom_id'];
        title?: Modal['title'];
        label?: Modal['title'];
        components: Modal['components']
    }


    export function randomWeight(objects: object[]): object
    export function randomWords(options?: {
        exactly?: boolean;
        maxLength?: number;
        min?: number;
        max?: number;
        wordsPerString?: number;
        formatter(word: string): void;
        separator: string;
        join: string;
    }): string | string[]

    export async function fetch(url: string, key?: string, body?: any, postRequest?: boolean, returnRaw?: boolean): Promise<object|string|null>;


    export class Duration extends null {
        static get timeIds(): Set<string>;
        static validate(value: string): boolean;
        static parse(value: string): number | null;
        static determineTimeType(str: string): number;
    };

    export class Tasks extends null {
        static create(options: {
            id: string;
            time: string;
            shouldCancel?: boolean
        }, run: Function): void;
        
        static delete(id: string): void;
    }
}