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

async function load() {
    let file = path.resolve(".", "behavior.json");
    let _behavior;

    if (!fs.existsSync(file)) {
        _behavior = {workspaces: ["_workspace"]};
        let json = JSON.stringify(_behavior, null, 4);
        await fs.promises.writeFile(file, json);
    } else {
        let json = (await fs.promises.readFile(file)).toString();
        _behavior = JSON.parse(json);
    }

    for (let workspace of _behavior.workspaces) {
        workspace = path.resolve(".", workspace);
        if (!fs.existsSync(workspace)) {
            await fs.promises.mkdir(workspace);
        }
        let configFile = path.resolve(workspace, "_config.json");
        if (!fs.existsSync(configFile)) {
            await fs.promises.writeFile(configFile, JSON.stringify(config, null, 4));
        }

        behavior.workspaces.push(workspace);
    }
}

app.on("ready", async () => {
    await load();
    app.emit("create-window");
});

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
