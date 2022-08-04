let fetch;

try {
    fetch = require("@elara-services/fetch");
} catch {

}

module.exports = async (url, key = "", body = undefined, postRequest = false, returnRaw = false) => {
    if (!fetch) throw new Error(`Unable to find @elara-services/fetch package`);
    try {
        let headers = { 
            "User-Agent": `Services v${Math.floor(Math.random() * 999999)}`
        };
        if (key !== "" && key) headers.Authorization = key;
        let res = await fetch(url, postRequest ? "POST" : "GET")
        .header(headers)
        .body(body, "json")
        .send()
        .catch(() => ({ statusCode: 500 }));
        if (res.statusCode !== 200) return null;
        if (returnRaw) return res.body;
        return res.json();
    } catch {
        return null;
    }
}