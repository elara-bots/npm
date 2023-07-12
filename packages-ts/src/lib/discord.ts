import { is } from "@elara-services/utils";
import { ComponentType } from "discord-api-types/v10";
import type {
    ButtonNumberStyles,
    ButtonOptions,
    ModalOptions,
    SelectOptions,
    Slash,
    SlashOptions,
    TextInputOptions,
} from "../interfaces";
export const ButtonStyle = {
    PRIMARY: 1,
    BLURPLE: 1,
    SECONDARY: 2,
    GREY: 2,
    SUCCESS: 3,
    GREEN: 3,
    DANGER: 4,
    RED: 4,
    LINK: 5,
    URL: 5,
};

export const Interactions = {
    button: (options: ButtonOptions = {}) => {
        if (typeof options.style === "string") {
            const style = ButtonStyle[options.style] as ButtonNumberStyles;
            if (style) {
                options.style = style;
            } else {
                options.style = 2;
            }
        }

        if (
            typeof options.url === "string" &&
            options.url.match(/(https?|discord):\/\//gi)
        ) {
            options.style = 5;
            options.id = "";
        }
        return {
            custom_id: options?.id ?? options?.custom_id ?? "",
            label: options?.title ?? options?.label ?? "",
            type: options?.type ?? 2,
            style: options?.style ? options.style : 2,
            disabled:
                typeof options.disabled === "boolean"
                    ? options.disabled
                    : false,
            emoji: options?.emoji ?? undefined,
            url: options?.url ?? undefined,
        };
    },

    select: (options: SelectOptions = {}) => {
        if (
            options.type === ComponentType.StringSelect &&
            !Array.isArray(options.options)
        ) {
            throw new Error(
                `[Interactions#select]: The 'options' isn't an array.`,
            );
        }
        const data = {
            custom_id: "",
            placeholder: "",
            min_values: 0,
            max_values: 0,
            options: [],
            type: 3,
            disabled: false,
        };

        if (is.string(options.id)) {
            data.custom_id = options.id;
        } else if (is.string(options.custom_id)) {
            data.custom_id = options.custom_id;
        }
        if (is.string(options.placeholder)) {
            data.placeholder = options.placeholder;
        } else if (is.string(options.holder)) {
            data.placeholder = options.holder;
        }
        if (is.number(options.max_values)) {
            data.max_values = options.max_values;
        } else if (is.number(options.max)) {
            data.max_values = options.max;
        }
        if (is.number(options.min_values)) {
            data.min_values = options.min_values;
        } else if (is.number(options.min)) {
            data.min_values = options.min;
        }

        if (is.boolean(options.disabled)) {
            data.disabled = options.disabled;
        }
        if (is.number(options.type)) {
            data.type = options.type;
        }
        if (is.array(options.options)) {
            data.options === options.options;
        }

        return data;
    },

    modal: (options: ModalOptions = { components: [] }) => {
        if (!is.array(options.components)) {
            throw new Error(
                `[Interactions#modal]: 'components' isn't an array, or is empty.`,
            );
        }
        const data = {
            custom_id: "",
            title: "",
            components: options.components,
        };
        if (is.string(options.id)) {
            data.custom_id = options.id;
        } else if (is.string(options.custom_id)) {
            data.custom_id = options.custom_id;
        }

        if (is.string(options.title)) {
            data.title = options.title;
        } else if (is.string(options.label)) {
            data.title = options.label;
        }
        return data;
    },

    textInput: (options: TextInputOptions = {}, row = false) => {
        const data = {
            type: 4,
            custom_id: "",
            style: 1,
            label: "",
            min_length: 0,
            max_length: 0,
            placeholder: "",
            value: "",
            required: false,
        };
        if (is.number(options.type)) {
            data.type = options.type;
        }
        if (is.string(options.id)) {
            data.custom_id = options.id;
        } else if (is.string(options.custom_id)) {
            data.custom_id = options.custom_id;
        }

        if (is.string(options.label)) {
            data.label = options.label;
        } else if (is.string(options.title)) {
            data.label = options.title;
        }

        if (is.string(options.placeholder)) {
            data.placeholder = options.placeholder;
        } else if (is.string(options.holder)) {
            data.placeholder = options.holder;
        }

        if (is.boolean(options.required)) {
            data.required = options.required;
        }

        if (is.string(options.value)) {
            data.value = options.value;
        }

        if (is.number(options.style)) {
            data.style = options.style;
        }
        if (is.number(options.min)) {
            data.min_length = options.min;
        } else if (is.number(options.min_length)) {
            data.min_length = options.min_length;
        }

        if (is.number(options.max)) {
            data.max_length = options.max;
        } else if (is.number(options.max_length)) {
            data.max_length = options.max_length;
        }

        if (row) {
            return { type: 1, components: [data] };
        }
        return data;
    },
};

export const Duration = {
    parse: (value: string) => {
        const MATCHES_ALL = value.match(/\d+\s*[A-Za-z]+/g);
        if (MATCHES_ALL) {
            let totalTime = 0;
            for (const dur of MATCHES_ALL) {
                const n = dur.match(/\d+/g) || ["0"];
                const [num, [str]] = [
                    parseInt(n[0]),
                    dur.match(/[A-Za-z]+/g) || [""],
                ];
                if (isNaN(num)) {
                    totalTime = 0;
                } else {
                    totalTime += num * Duration.determineTimeType(str);
                }
            }
            if (totalTime) {
                return totalTime;
            }
        }

        return null;
    },

    determineTimeType: (str: string) => {
        switch (str) {
            case "ms":
            case "millisecond":
            case "milliseconds":
                return 1;

            case "s":
            case "second":
            case "seconds":
                return 1000;

            case "m":
            case "min":
            case "mins":
            case "minute":
            case "minutes":
                return 60 * 1000;

            case "h":
            case "hr":
            case "hour":
            case "hours":
                return 60 * 60 * 1000;

            case "d":
            case "day":
            case "days":
                return 24 * 60 * 60 * 1000;

            case "w":
            case "week":
            case "weeks":
                return 7 * 24 * 60 * 60 * 1000;

            case "mo":
            case "month":
            case "months":
                return 30 * 24 * 60 * 60 * 1000;

            case "y":
            case "year":
            case "years":
                return 365 * 24 * 60 * 60 * 1000;

            default:
                return 1;
        }
    },

    validate: (value: string) => {
        const MATCHES_ALL = value.match(/\d+\s*[A-Za-z]+/g);
        if (MATCHES_ALL) {
            for (const match of MATCHES_ALL) {
                const [num, str] = [
                    match.match(/\d+/g),
                    match.match(/[A-Za-z]+/g),
                ];
                if (!num || num.length !== 1) {
                    return false;
                }
                if (!str || str.length !== 1) {
                    return false;
                }
                if (!Number.isInteger(parseInt(num[0]))) {
                    return false;
                }
                if (!Duration.timeIds.has(str[0])) {
                    return false;
                }
            }

            return true;
        }

        return false;
    },

    timeIds: new Set([
        "ms",
        "millisecond",
        "milliseconds",
        "s",
        "second",
        "seconds",
        "m",
        "min",
        "mins",
        "minute",
        "minutes",
        "h",
        "hr",
        "hrs",
        "hour",
        "hours",
        "d",
        "day",
        "days",
        "w",
        "week",
        "weeks",
        "mo",
        "month",
        "months",
        "y",
        "year",
        "years",
    ]),
};

export const SlashBuilder = {
    TEXT_BASED_CHANNELS: [0, 5, 11, 12],

    types: {
        sub_command: 1,
        sub_group: 2,
        string: 3,
        integer: 4,
        boolean: 5,
        user: 6,
        channel: 7,
        role: 8,
        mentionable: 9,
        number: 10,
        context: {
            user: 2,
            message: 3,
        },
    },

    context: {
        user: (name: string, options: object) =>
            SlashBuilder.create(name, "", {
                type: SlashBuilder.types.context.user,
                ...options,
            }),
        message: (name: string, options: object) =>
            SlashBuilder.create(name, "", {
                type: SlashBuilder.types.context.message,
                ...options,
            }),
    },

    choice: (
        name: string,
        value: string,
        name_localizations: Record<string, string>,
    ) => {
        return { name, value, name_localizations };
    },

    option: (data: SlashOptions) => {
        // @ts-ignore
        const _data: SlashOptions & {
            name_localizations: Record<string, string>;
            description_localizations: Record<string, string>;
        } = { ...data };
        if (data.locale?.names) {
            _data.name_localizations = data.locale.names;
        }
        if (data.locale?.descriptions) {
            _data.description_localizations = data.locale.descriptions;
        }
        if ("locale" in _data) {
            delete _data["locale"];
        }
        return _data;
    },

    create: (name: string, description: string, options: Slash = {}) => {
        const obj: {
            name: string;
            description: string;
            name_localizations: Record<string, string> | undefined;
            description_localizations: Record<string, string> | undefined;
            options: unknown[];
            type: number;
            dm_permission: boolean;
            default_member_permissions: string;
        } = {
            name,
            description,
            name_localizations: undefined,
            description_localizations: undefined,
            options: [],
            type: 0,
            dm_permission: false,
            default_member_permissions: "",
        };
        if (options?.locale?.names) {
            obj.name_localizations = options.locale.names;
        }
        if (options?.locale?.descriptions) {
            obj.description_localizations = options.locale.descriptions;
        }
        if (is.array(options.options)) {
            obj["options"] = options.options;
        }
        if (is.number(options.type)) {
            obj.type = options.type;
        }

        if ("dmPermission" in options && is.boolean(options.dmPermission)) {
            obj["dm_permission"] = options.dmPermission;
        } else if (
            "dm_permission" in options &&
            is.boolean(options.dm_permission)
        ) {
            obj["dm_permission"] = options.dm_permission;
        }

        if (
            "default_member_permissions" in options &&
            is.string(options.default_member_permissions)
        ) {
            obj.default_member_permissions = options.default_member_permissions;
        } else if (
            "defaultMemberPermissions" in options &&
            is.string(options.defaultMemberPermissions)
        ) {
            obj.default_member_permissions = options.defaultMemberPermissions;
        }
        return obj;
    },
};
