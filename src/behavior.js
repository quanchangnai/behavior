import {app} from 'electron'
import path from "path";
import fs from "fs";
import config from "./config";

let behavior = {
    workspaces: [],
    openedWorkspaces: new Map(),
    getWorkspace(webContents) {
        return this.openedWorkspaces.get(webContents.id);
    },
    getConfigFile(webContents) {
        return path.resolve(this.getWorkspace(webContents), "_config.json");
    }
};

function load() {
    let file = path.resolve(".", "behavior.json");
    let _behavior;

    if (!fs.existsSync(file)) {
        _behavior = {workspaces: ["_workspace"]};
        let json = JSON.stringify(_behavior, null, 4);
        fs.writeFileSync(file, json);
    } else {
        let json = fs.readFileSync(file).toString();
        _behavior = JSON.parse(json);
    }

    for (let workspace of _behavior.workspaces) {
        workspace = path.resolve(".", workspace);
        if (!fs.existsSync(workspace)) {
            fs.mkdirSync(workspace);
        }
        let configFile = path.resolve(workspace, "_config.json");
        if (!fs.existsSync(configFile)) {
            fs.writeFileSync(configFile, JSON.stringify(config, null, 4));
        }

        behavior.workspaces.push(workspace);
    }
}

app.on("ready", load);

app.on("browser-window-created", (event, window) => {
    outer:
        for (let workspace of behavior.workspaces) {
            for (let openedWorkspace of behavior.openedWorkspaces.values()) {
                if (workspace === openedWorkspace) {
                    continue outer;
                }
            }
            behavior.openedWorkspaces.set(window.webContents.id, workspace);
            window.on("close", () => behavior.openedWorkspaces.delete(window.webContents.id));
            return;
        }

});


export default behavior
