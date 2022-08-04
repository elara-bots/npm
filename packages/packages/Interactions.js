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
            label: options?.title ?? "",
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
};