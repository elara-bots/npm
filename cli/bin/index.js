#! /usr/bin/env node
const yargs = require("yargs");
const { execSync } = require("child_process");
const { writeFileSync } = require("fs");

const is = {
    str: (str) => {
        if (typeof str !== "string" || !str) {
            return false;
        }
        return true;
    },
    bool: (bool) => {
        if (typeof bool !== "boolean") {
            return false;
        }
        return true;
    },
    arr: (arr) => {
        if (Array.isArray(arr) && arr.length) {
            return true;
        }
        return false;
    }
};

const log = (...args) => console.log(`[${new Date().toLocaleString("en-US", { timeZone: "America/Los_Angeles" })}]: [CLI]: `, ...args);

const sleep = (m = 5000) => new Promise((r) => setTimeout(r, m));


const runCmd = async (cmd, msg, ms = 5000) => {
    log(msg);
    await execSync(cmd);
    return await sleep(ms);
}

const opt = yargs.usage(`Usage: epack -n <name> -d <description> -p <...packages> -no <...no_save_packages>`)
    .option("n", {
        describe: `The name for the package`,
        type: "string",
        demandOption: true,
    })
    .option("d", {
        describe: `The description for the package`,
        type: "string",
        demandOption: true,
    })
    .option("p", {
        describe: "The packages to install",
        type: "string",
        demandOption: false,
    })
    .option("no", {
        describe: "The no-save packages to install",
        type: "string",
        demandOption: false,
    })
    .option("r", {
        describe: `The repo url`,
        type: "string",
        demandOption: false,
    })
    .option("s", {
        describe: `The start of the package name`,
        type: "string",
        demandOption: false,
    })
    .help(true)
    .argv;

let { n, d, p, no, r, s } = opt;

if (
    !is.str(n) && !is.str(d) &&
    !is.str(p) && !is.str(no) &&
    !is.str(r) && !is.str(s)
) {
    yargs.showHelp();
    return;
}
if (is.arr(s)) {
    s = s.join(" ");
}
if (is.arr(n)) {
    n = n.join("");
}
if (is.arr(d)) {
    d = d.join(" ");
}
if (is.arr(p)) {
    p = p.join(" ");
}
if (is.arr(no)) {
    no = no.join(" ");
}
if (is.arr(r)) {
    r = r.join(" ");
}

(async () => {
    if (!n) {
        return log(`No 'n' (name) provided`);
    }
    await runCmd(`git clone https://github.com/elara-bots/TS-Package.git ${n}`, `Cloning TS-Package repo into /${n}`);
    await runCmd(`cd ${n} && npm i --silent && npm run clean --silent`, `Installing default packages and removing the .git folder.`);
    const otherPacks = [];
    if (p) {
        otherPacks.push(`npm i ${p} --silent`);
    }
    if (no) {
        otherPacks.push(`npm i --no-save --silent ${no}`);
    }
    if (otherPacks.length) {
        await runCmd(`cd ${n} && ${otherPacks.join(" && ")}`, `Installing ${p || ""} ${no ? `${p ? ", and " : ""} ${no}` : ""} Packages.`);
    }
    await sleep();
    const data = {
        name: "",
        description: "",
        start: s || "@elara-services/",
    };
    if (n) {
        log(`Using name: ${n}`);
        data.name = n;
    }
    if (d) {
        log(`Using description: ${d}`);
        data.description = d;
    }
    const pack = require(`${process.cwd()}/${n}/package.json`);
    if (data.name) {
        if (data.start !== "@elara-services/") {
            pack.repository.url = find("repo") || "";
        } else {
            pack.repository.url = `https://github.com/elara-bots/npm/tree/main/${data.name}`;
        }
        pack.name = `${data.start}${data.name}`;
    }
    if (data.description) {
        pack.description = data.description;
    }
    await writeFileSync(`${process.cwd()}/${n}/package.json`, JSON.stringify(pack, undefined, 2));
    log(`Finished!`);
    return process.exit(1);
})();