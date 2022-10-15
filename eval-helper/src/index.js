const fetch = require("@elara-services/fetch");
const { inspect } = require("node:util");

/**
 * @param {object} options
 * @param {any} [options.code] - The code to run (this or the attachment is required) 
 * @param {string[]} [options.attachment] - An attachment to run code from (supports: js, txt)
 * @param {boolean} [options.async] - Force async to be enabled.
 * @param {string[]} [options.sensor] - An array of strings to sensor 
 */
exports.handle = async (options = {}) => {
    let { code, attachment, sensor } = options ?? { attachment: "", code: "", sensor: [] };
    if (!code && !attachment) throw new Error(`You failed to provide 'code' or 'attachment'`);
    if (typeof code === "undefined" || code === null) code = ""; 
    let shouldBeAsync = false;
    if (options.async) shouldBeAsync = true;
    function clean(code) {
        let c = code;
        if (!sensor?.length) return c;
        for (const s of sensor) c = c.replace(new RegExp(s, "g"), "[X]")
        return c;
    };
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
    let ev = eval(shouldBeAsync ? `(async () => {\n${code}\n})();` : code);
    if (ev instanceof Promise || typeof ev === "object") ev = await ev;
    return clean(inspect(ev, { depth: 0 }));
}