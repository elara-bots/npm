import { execSync } from "child_process";
import { writeFileSync } from "fs";

const sleep = (ms = 5_000) => new Promise((r) => setTimeout(r, ms));
const log = (...args: unknown[]) => console.log(`[${new Date().toLocaleString("en-US", { timeZone: "America/Los_Angeles" })}]: `, ...args);

(async () => {
    const args = process.argv.filter((c) => c.includes("="));
    if (!args.length) {
        throw new Error(`You didn't provide any params to setup`);
    }
    const find = (name: string) => args.find((c) => c.startsWith(name.toLowerCase()))?.split?.("=")?.[1] || "";
    const git = find("git");
    if (git) {
        log(`Removing the .git folder.`);
        await execSync(`npm run clean`);
    }
    log(`Installing all default packages... one moment`);
    await execSync(`npm i`);
    await sleep();
    const data = {
        name: "",
        description: "",
        start: find("start") || "@elara-services/",
    };

    const name = find("name");
    if (name) {
        log(`Using name: ${name}`);
        data.name = name;
    }
    const description = find("description");
    if (description) {
        log(`Using description: ${description}`);
        data.description = description;
    }
    const packages = find("packages");
    if (packages) {
        log(`Installing the packages ${packages}`);
        await execSync(`npm i ${packages}`);
    }
    await sleep();
    const noSave = find("no_save");
    if (noSave) {
        log(`Installing the 'no-save' packages ${noSave}`);
        await execSync(`npm i --no-save ${noSave}`);
    }
    await sleep();
    const pack = (await import("./package.json")).default;
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
    await writeFileSync(`${process.cwd()}/package.json`, JSON.stringify(pack, undefined, 2));
    log(`Done!`);
})();