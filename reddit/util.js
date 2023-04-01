require("moment-duration-format");
const { fetch } = require("@elara-services/packages");
const moment = require("moment");

/**
 * @param {string} endpoint 
 * @param {number} [limit] 
 * @param {string} [sort]
 * @returns {Promise<Array<object>>}
 */
exports.fetchPosts = async (endpoint, limit = 30, sort = "new") => {
    const res = await fetch(`https://www.reddit.com/${endpoint}/.json?limit=${limit}&sort=${sort}`);
    if (!res?.data?.children?.length) return [];
    return res.data.children.map(c => c.data);
}

/**
 * @param {string} name 
 * @param {string} type 
 * @returns {Promise<{ status: boolean, message?: string, data?: object }>}
 */
exports.isValid = async (name, type = "r") => {
    let res = await fetch(`https://www.reddit.com/${type === "u" ? "user" : type}/${name}/about.json`);
    if (!res?.data) return { status: false, message: `Not Found` };
    return { status: true, data: res.data } 
};

/**
 * @param {string|Date} date 
 * @param {string} format 
 * @param {boolean} parse 
 * @returns {string|number}
 */
exports.time = (date, format = "m", parse = true) => {
    const d = moment.duration(new Date().getTime() - new Date(date * 1000).getTime()).format(format);
    if (parse) return parseInt(d.replace(/,/g, ""))
    return d;
}