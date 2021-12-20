import {ipcMain, shell} from 'electron'
import defaultConfig from "./config";
import fs from 'fs'
import path from 'path'

ipcMain.handle("dev-tools", event => {
    if (event.sender.isDevToolsOpened()) {
        event.sender.closeDevTools();
    } else {
        event.sender.openDevTools();
    }
});


/**
 * 行为树模板配置文件名
 */
let configFile;
/**
 * 工作空间路径
 */
let workPath;


async function loadBehaviorJson() {
    let params;
    let file = path.resolve(".", "behavior.json");

    if (!fs.existsSync(file)) {
        params = {configFile: "behavior.config.json", workPath: "behavior_trees"};
        let json = JSON.stringify(params, null, 4);
        await fs.promises.writeFile(file, json);
    } else {
        let json = (await fs.promises.readFile(file)).toString();
        params = JSON.parse(json);
    }

    configFile = path.resolve(".", params.configFile);
    workPath = path.resolve(".", params.workPath);

    if (!fs.existsSync(workPath)) {
        await fs.promises.mkdir(workPath);
    }
}

ipcMain.handle("load-config", async () => {
    await loadBehaviorJson();

    if (!fs.existsSync(configFile)) {
        await fs.promises.writeFile(configFile, JSON.stringify(defaultConfig, null, 4));
    }

    let configJson = (await fs.promises.readFile(configFile)).toString();
    return JSON.parse(configJson);
});

ipcMain.handle("load-trees", async () => {
    let files = await fs.promises.readdir(workPath);
    let trees = [];

    for (let file of files) {
        let fileName = path.resolve(workPath, file);
        if (!fileName.endsWith(".json")) {
            continue;
        }

        let fileStats = await fs.promises.stat(fileName);
        if (!fileStats.isFile()) {
            continue;
        }
        let fileJson = (await fs.promises.readFile(fileName)).toString();
        trees.push(JSON.parse(fileJson));
    }

    trees.sort((t1, t2) => t1.id - t2.id);

    return trees;
});


ipcMain.handle("save-tree", async (event, tree) => {
    let treeJson = JSON.stringify(tree, null, 4);
    let treeFile = path.resolve(workPath, tree.id + ".json");
    await fs.promises.writeFile(treeFile, treeJson, {encoding: "utf-8"});
});

ipcMain.handle("delete-tree", async (event, treeId) => {
    let treeFile = path.resolve(workPath, treeId + ".json");
    await fs.promises.unlink(treeFile);
});

ipcMain.handle("open-work-path", async () => {
    await shell.openPath(workPath);
});


