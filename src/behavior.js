import path from "path";
import fs from "fs";
import config from "./config";

function load() {
    let behavior;
    let file = path.resolve(".", "behavior.json");

    if (!fs.existsSync(file)) {
        behavior = {configFile: "behavior.config.json", workPath: "behavior_trees"};
        let json = JSON.stringify(behavior, null, 4);
        fs.writeFileSync(file, json);
    } else {
        let json = fs.readFileSync(file).toString();
        behavior = JSON.parse(json);
    }

    behavior.configFile = path.resolve(".", behavior.configFile);
    behavior.workPath = path.resolve(".", behavior.workPath);

    if (!fs.existsSync(behavior.configFile)) {
        fs.writeFileSync(behavior.configFile, JSON.stringify(config, null, 4));
    }

    if (!fs.existsSync(behavior.workPath)) {
        fs.mkdirSync(behavior.workPath);
    }

    return behavior
}

export default load()
