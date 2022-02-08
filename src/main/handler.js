import {ipcMain} from 'electron'
import behavior from "./behavior";
import fs from 'fs'
import path from 'path'
import {validateConfig} from "./validator";

ipcMain.on("title", event => behavior.sendTitle(event.sender));

ipcMain.handle("load-config", async event => {
    let configFile = behavior.getConfigFile(event.sender);
    let configJson;
    try {
        configJson = (await fs.promises.readFile(configFile)).toString();
    } catch (e) {
        await behavior.createWorkspace(path.dirname(configFile));
        configJson = (await fs.promises.readFile(configFile)).toString();
    }

    let config = JSON.parse(configJson);
    if (!validateConfig(config)) {
        let msg = configFile + " 配置错误\n";
        msg += JSON.stringify(validateConfig.errors, null, 4);
        throw new Error(msg);
    }

    return config;
});

ipcMain.handle("load-trees", async event => {
        let workspace = behavior.getWorkspace(event.sender);
        let files = await fs.promises.readdir(workspace);
        let trees = [];

        for (let file of files) {
            let fileName = path.resolve(workspace, file);
            if (!fileName.endsWith(".json")) {
                continue;
            }
            let fileStats = await fs.promises.stat(fileName);
            if (!fileStats.isFile()) {
                continue;
            }
            let basename = path.basename(fileName, ".json");
            if (basename.startsWith("_")) {
                continue;
            }

            try {
                let fileJson = (await fs.promises.readFile(fileName)).toString();
                let root = JSON.parse(fileJson);
                trees.push({name: basename, root});
            } catch (e) {
                event.sender.send("msg", `加载行为树(${basename})失败.`, "error");
                throw e;
            }
        }

        trees.sort((t1, t2) => t1.id - t2.id);

        return trees;
    }
);

ipcMain.handle("save-tree", async (event, tree) => {
    let workspace = behavior.getWorkspace(event.sender);
    let treeJson = JSON.stringify(tree.root, null, 4);
    let treeFile = path.resolve(workspace, tree.name + ".json");
    await fs.promises.writeFile(treeFile, treeJson, {encoding: "utf-8"});
});

ipcMain.handle("delete-tree", async (event, treeName) => {
    let workspace = behavior.getWorkspace(event.sender);
    let treeFile = path.resolve(workspace, treeName + ".json");
    await fs.promises.unlink(treeFile);
});

ipcMain.handle("rename-tree", async (event, oldTreeName, newTreeName) => {
    let workspace = behavior.getWorkspace(event.sender);
    let oldTreeFile = path.resolve(workspace, oldTreeName + ".json");
    let newTreeFile = path.resolve(workspace, newTreeName + ".json");
    if (behavior.selectedTree === oldTreeName) {
        behavior.selectedTree = newTreeName;
    }
    await fs.promises.rename(oldTreeFile, newTreeFile);
});

ipcMain.on("select-tree", (event, treeName) => {
    behavior.selectedTree = treeName;
});

ipcMain.handle("open-workspace-path", async (event, treeName) => {
    await behavior.openWorkspacePath(event.sender, treeName)
});

ipcMain.handle("open-workspace", async (event, workspace) => {
    await behavior.openWorkspace(workspace);
});

ipcMain.handle("delete-workspace", (event, workspace) => {
    behavior.deleteWorkspace(workspace);
});

