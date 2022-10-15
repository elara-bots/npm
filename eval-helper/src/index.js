const fetch = require("@elara-services/fetch");
const { inspect } = require("node:util");

/**
 * @param {object} options
 * @param {any} [options.code] - The code to run (this or the attachment is required) 
 * @param {string[]} [options.attachment] - An attachment to run code from (supports: js, txt)
 * @param {boolean} [options.async] - Force async to be enabled.
 */
exports.getCode = async (options = {}) => {
    let { code, attachment } = options ?? { attachment: "", code: "" };
    if (!code && !attachment) throw new Error(`You failed to provide 'code' or 'attachment'`);
    if (typeof code === "undefined" || code === null) code = ""; 
    let shouldBeAsync = false;
    if (options.async) shouldBeAsync = true;
    if (attachment && [
        ".js",
        ".txt"
    ].some(c => attachment.includes(c))) {
        let r = await fetch(attachment).send().catch(() => ({ statusCode: 500 }));
        if (r?.statusCode === 200) {
            let text = r.text().toString();
            if (text) code += text;
        }
    };
    if ([ "return", "await" ].some(c => code.includes(c))) shouldBeAsync = true;
    if (code.startsWith('```js') && code.endsWith('```')) code = code.replace('```js', '').replace('```', '');
    if (shouldBeAsync) return `(async () => {\n${code}\n})();`
    return code
};

exports.handlePromise = async (code) => {
    if (code instanceof Promise || typeof code === "object") code = await code;
    return code;
};

/**
 * @param {string} code 
 * @param {string[]} sensors - An array of strings to sensor 
 * @returns {Promise<string>}
 */
exports.clean = async (code, sensors = []) => {
    if (!code || !sensors?.length) return "";
    let cleaned = inspect((await exports.handlePromise(code)), { depth: 0 });
    function clean() {
        let c = cleaned;
        for (const s of sensors) c = c.replace(new RegExp(s, "g"), "[X]")
        return c
    };
    return clean();
}