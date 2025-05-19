#! /usr/bin/env node

const { is, files, status, log, times, generate } = require("@elara-services/basic-utils");
const yargs = require("yargs");
const { Roblox } = require("../dist/src");
const { isAbsolute } = require("path");
const { get } = require("lodash");
const configPath = files.path(yargs.argv.$0.split("\\roblox.js")[0]);
const configFile = files.path(configPath, "config.json");
const defaultConfig = {
    bloxlink: "",
    rowifi: "",
    /** @type {Record<string, string>} */
    rover: {},
    saveTo: "",
    timeZone: "",
    cookie: "",
    debug: false,
};

(async () => {
    if (!files.has(configFile)) {
        await files.create(configPath, "config.json", defaultConfig);
    }
    const data = files.get(configFile, true);
    if (!data.status) {
        return log(`Unable to get the config data.`);
    }
    /** @type {typeof defaultConfig} */
    const conf = data.json;
    if (is.string(conf.timeZone)) {
        times.timeZone = conf.timeZone;
    }
    const ro = new Roblox()
        .setDebug(conf.debug);


    if (is.string(conf.cookie)) {
        ro.setCookie(conf.cookie);
    }
    if (is.string(conf.bloxlink)) {
        ro.services.default.add("bloxlink", conf.bloxlink);
    }
    if (is.string(conf.rowifi)) {
        ro.services.default.add("rowifi", conf.rowifi);
    }
    if (is.object(conf.rover, true)) {
        ro.services.default.add("rover", "ignored", { list: conf.rover });
    }
    const { } = yargs
        .usage(`roblox <options>`)
        .option("json", {
            description: `If you want to save the response to a .json file in the saveTo config path.`,
            default: false,
            required: false,
            boolean: true,
        })
        .option("res", {
            string: true,
            description: `The data you want to get console logged from the response, you can use stuff like ("users[0]", "users[number_here].name", "users[0].user" or "users[0].groups[...]" (if "--full" is added), "count", "ids")`,
            required: false,
            default: "",
        })
        .command("whois", `Look up a Roblox profile`, (b) => {
            return b
                .option(`user`, {
                    description: `What is the Discord ID?`,
                    required: false,
                    string: true,
                })
                .option("name", {
                    description: `Search by Roblox username`,
                    required: false,
                    string: true,
                })
                .option("id", {
                    description: `Search by Roblox ID`,
                    required: false,
                    string: true,
                    number: true,
                })
                .option("basic", {
                    description: `Only return the basic Roblox info`,
                    required: false,
                    boolean: true,
                    default: false,
                })
                .option("guild", {
                    description: `What is the guild ID? (required for some services.)`,
                    required: false,
                    string: true,
                })
                .option("service", {
                    description: `Which service? (only look for users verified with this service and only available with the --user option)`,
                    required: false,
                    string: true,
                })
                .option("groups", {
                    boolean: true,
                    description: `If the groups should be included in the response.`,
                    required: false,
                    default: true,
                })
        }, async ({ user, name, id, json, basic, service, guild, groups, res }) => {
            console.time(`whois`);
            if (!user && !name && !id) {
                console.timeEnd("whois");
                return yargs.showHelp();
            }
            log(yargs.argv);
            let r;
            let fileName;
            if (is.string(user)) {
                r = await ro.get(`<@${user.replace(/<@!?|>/gi, "")}>`, {
                    guildId: guild,
                    basic,
                    service,
                    groups,
                });
                fileName = `roblox/discord/${user.replace(/<@!?|>/gi, "")}.json`;
            } else if (is.string(name)) {
                r = await ro.api.search(name, basic, groups);
                fileName = `roblox/search/${name}.json`;
            } else if (id) {
                r = await (basic ? ro.api.basic(id, service) : ro.api.fetch(id, service, groups));
                fileName = `roblox/id/${id}.json`;
            }
            if (!r) {
                return log(`You provided an invalid option`);
            }
            if (!r.status) {
                console.timeEnd("whois");
                return log(r.message);
            }
            if (is.string(res)) {
                console.timeEnd("whois");
                return log(get(r, res) || "You provided an invalid '--res' option.");
            }
            if (is.string(fileName)) {
                await saveToFile({ json, path: conf.saveTo }, fileName, r);
            }
            log(r);
            return console.timeEnd("whois");
        })
        .command("set", `Set the config options`, (b) => {
            return b
                .option(`name`, {
                    string: true,
                    description: `The name for the value.`,
                    required: true
                })
                .option(`value`, {
                    string: true,
                    required: true,
                    description: `The value of the key`
                })
        }, async ({ name, value }) => log(await setConfigOption(name, value)))

        .command("bulk", `Bulk fetch usernames or IDs`, (b) => {
            return b.option(`ids`, {
                description: `Input Roblox user IDs`,
                required: false,
                number: true,
                string: true,
                array: true,
            })
                .option("search", {
                    required: false,
                    string: true,
                    array: true,
                    description: `Input Roblox usernames`
                })
                .option("groups", {
                    boolean: true,
                    description: `If the groups should be included in the response.`,
                    required: false,
                    default: true,
                })
                .option("full", {
                    boolean: true,
                    description: `If the full data to be fetched for all found users.`,
                    required: false,
                    default: false,
                })
        }, async ({ ids, search, json, full, groups, res }) => {
            if (!is.array(ids) && !is.array(search)) {
                return yargs.showHelp();
            }
            const name = is.array(ids) ? "id" : "search";
            const r = await ro.api.bulk[name === "id" ? "fetch" : "search"](is.array(ids) ? ids : search, full, groups);
            if (!r.status) {
                return log(r.message);
            }
            const data = {
                timestamp: new Date().toLocaleString(),
                count: r.users.length,
                ids: r.users.map((c) => c.id ?? c.user?.id),
                users: r.users,
                search: is.array(ids) ? ids : search,
            };
            const file = await saveToFile({ json, path: conf.saveTo }, `roblox/bulk/${name}/${generate(10)}.json`, data);
            if (file) {
                log(file);
            }
            if (is.string(res)) {
                return log(get(data, res) || "You provided an invalid '--res' option.");
            }
            return log(r);
        })

        .command("debug <toggle>", `Enable/Disable the debugger`)
        .command("reset", `Reset a config option`, (b) => {
            return b.option("name", {
                description: `What is the name of the config option?`,
                required: true,
                string: true,
            })
        }, async ({ name }) => log(await resetConfigOption(name)))
        .help()
        .argv;
    if (is.array(yargs.argv._)) {
        if (yargs.argv._.includes("debug")) {
            return log(await setConfigOption("debug", yargs.argv.toggle === "true" ? true : false))
        }
        return;
    }
    return yargs.showHelp();
})();


async function setConfigOption(name, value) {
    const data = files.get(configFile, true);
    if (!data.status) {
        return data;
    }
    if (name.includes(".")) {
        data.json[name.split(".")[0]][`${name.split(".")[1]}`] = value;
    } else {
        if (name === "saveTo") {
            if (value === "current") {
                value = process.cwd();
            }
            if (!isAbsolute(value)) {
                return status.error(`Path (${value}) isn't the absolute path`)
            }
        }
        if (name === "cookie" && !value.match(/CreateDate=%time_replace%/gi)) {
            return status.error(`Missing (%TIME_REPLACE%) in the cookie, it needs to be after "CreateDate" (ex: CreateDate=%TIME_REPLACE%)`);
        }
        data.json[name] = value;
    }
    const d = await files.create(configPath, "config.json", data.json);
    if (!d) {
        return status.error(`Unable to edit the config for (${name})`);
    }
    return status.success(`Successfully updated (${name}) config option.`);
}

async function resetConfigOption(name) {
    const data = files.get(configFile, true);
    if (!data.status) {
        return data;
    }
    const [n, r] = name.split(".");
    const v = name.includes(".") ? data.json[n][r] : data.json[name];
    let val;
    if (is.null(v) || is.undefined(v)) {
        return status.error(`Name (${name}) not found in the config file.`);
    }
    if (is.boolean(v)) {
        val = false;
    } else if (is.string(v)) {
        val = "";
    } else if (is.array(v)) {
        val = [];
    } else if (is.object(v, false)) {
        val = {};
    }
    if (name.includes(".")) {
        delete data.json[n][r];
    } else {
        data.json[name] = val;
    }
    const d = await files.create(configPath, "config.json", data.json);
    if (!d) {
        return status.error(`Unable to edit the config for (${name})`);
    }
    return status.success(`Successfully reset (${name}) config option.`);
}

async function saveToFile(options = { json: false, path: "" }, fileName = "", data = {}) {
    if (!options || !options.json || !options.path || !isAbsolute(options.path)) {
        return null;
    }
    const r = await files.create(files.path(options.path), fileName, data);
    if (r) {
        return files.path(options.path, fileName);
    }
    return null;
}