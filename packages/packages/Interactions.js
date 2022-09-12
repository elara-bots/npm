module.exports = class Interactions extends null {
    static button(options = {}) {
        if (typeof options.style === "string") {
            let styles = { PRIMARY: 1, BLURPLE: 1, SECONDARY: 2, GREY: 2, SUCCESS: 3, GREEN: 3, DANGER: 4, RED: 4, LINK: 5, URL: 5 };
            let style = styles[options.style?.toUpperCase()];
            if (!style) options.style = 2;
            else options.style = style; 
        };
        if (typeof options.url === "string" && options.url.match(/(https?|discord):\/\//gi)) {
            options.style = 5;
            options.id = "";
        }
        return {
            custom_id: options?.id ?? options?.custom_id ?? "",
            label: options?.title ?? options?.label ?? "",
            type: options?.type ?? 2,
            style: options?.style ? options.style : 2,
            disabled: Boolean(options.disabled),
            emoji: options?.emoji ?? undefined,
            url: options?.url ?? undefined
        };
    }

    static select(options = {}) {
        if (!options.options || !Array.isArray(options.options)) throw new Error(`[Dropdown#options]: isn't an array.`);
        return {
            custom_id: options?.id ?? options?.custom_id ?? "",
            placeholder: options?.holder ?? "",
            min_values: options?.min ?? 1,
            max_values: options?.max ?? 1,
            options: options?.options,
            type: options?.type ?? 3,
        }
    }

    static modal(options = {}) {
        if (!options.components || !Array.isArray(options.components)) throw new Error(`[Modal#components]: isn't an array!`);
        return {
            custom_id: options?.id ?? options?.custom_id,
            title: options?.title ?? options?.label,
            components: options.components
        };
    };

    static textInput(options = {}, row = false) {
        let data = {};

        if (options.type) data.type = options.type;
        else data.type = 4;

        if (options.id) data.custom_id = options.id;
        else if (options.custom_id) data.custom_id = options.custom_id;

        if (options.label) data.label = options.label;
        else if (options.title) data.label = options.title;
        
        if (options.style) data.style = options.style;
        else data.style = 1;

        if (options.min) data.min_length = options.min;
        else if (options.min_length) data.min_length = options.min_length;
        
        if (options.max) data.max_length = options.max;
        else if (options.max_length) data.max_length = options.max_length;

        if (options.holder) data.placeholder = options.holder;
        else if (options.placeholder) data.placeholder = options.placeholder;

        if (typeof options.required === "boolean") data.required = options.required;
        if (options.value) data.value = options.value;

        if (row) return data;
        return { type: 1, components: [ data ] };
    };
};