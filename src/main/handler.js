import {ipcMain} from 'electron'
import manager from "./manager";
import fs from 'fs'
import path from 'path'
import {validateConfig} from "./validator";

ipcMain.on("title", event => manager.sendTitle(event.sender));

ipcMain.handle("load-config", async event => {
    let configFile = manager.getConfigFile(event.sender);
    let configJson;
    try {
        configJson = (await fs.promises.readFile(configFile)).toString();
    } catch (e) {
        await manager.createWorkspace(path.dirname(configFile));
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
        let workspace = manager.getWorkspace(event.sender);
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
    let workspace = manager.getWorkspace(event.sender);
    let treeJson = JSON.stringify(tree.root, null, 4);
    let treeFile = path.resolve(workspace, tree.name + ".json");
    await fs.promises.writeFile(treeFile, treeJson, {encoding: "utf-8"});
});

ipcMain.handle("delete-tree", async (event, treeName) => {
    let workspace = manager.getWorkspace(event.sender);
    let treeFile = path.resolve(workspace, treeName + ".json");
    await fs.promises.unlink(treeFile);
});

ipcMain.handle("rename-tree", async (event, oldTreeName, newTreeName) => {
    let workspace = manager.getWorkspace(event.sender);
    let oldTreeFile = path.resolve(workspace, oldTreeName + ".json");
    let newTreeFile = path.resolve(workspace, newTreeName + ".json");
    if (manager.selectedTree === oldTreeName) {
        manager.selectedTree = newTreeName;
    }
    await fs.promises.rename(oldTreeFile, newTreeFile);
});

ipcMain.on("select-tree", (event, treeName) => {
    manager.selectedTree = treeName;
});

ipcMain.handle("open-workspace-path", async (event, treeName) => {
    await manager.openWorkspacePath(event.sender, treeName)
});

ipcMain.handle("open-workspace", async (event, workspace) => {
    await manager.openWorkspace(workspace);
});

ipcMain.handle("delete-workspace", (event, workspace) => {
    manager.deleteWorkspace(workspace);
});

