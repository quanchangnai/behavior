import {ipcMain} from 'electron'
import behavior from "@/behavior";
import fs from 'fs'
import path from 'path'
import {validateConfig} from "@/validator";

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
        throw new Error("行为树编辑器配置格式错误\n" + JSON.stringify(validateConfig.errors, null, 4));
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
            let basename = path.basename(fileName, ".json");
            if (!Number.isInteger(Number(basename))) {
                continue;
            }
            let fileStats = await fs.promises.stat(fileName);
            if (!fileStats.isFile()) {
                continue;
            }

            try {
                let fileJson = (await fs.promises.readFile(fileName)).toString();
                trees.push(JSON.parse(fileJson));
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
    let treeJson = JSON.stringify(tree, null, 4);
    let treeFile = path.resolve(workspace, tree.id + ".json");
    await fs.promises.writeFile(treeFile, treeJson, {encoding: "utf-8"});
});

ipcMain.handle("delete-tree", async (event, treeId) => {
    let workspace = behavior.getWorkspace(event.sender);
    let treeFile = path.resolve(workspace, treeId + ".json");
    await fs.promises.unlink(treeFile);
});

ipcMain.handle("open-work-path", async (event) => {
    await behavior.openWorkspacePath(event.sender);
});


