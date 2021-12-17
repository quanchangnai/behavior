import {ipcMain} from 'electron'
import defaultConfig from "@/config";
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
 * 基础配置文件，里面包含有行为树模板配置文件名和工作空间目录等
 */
let baseConfig;

/**
 * 工作空间路径
 */
let workPath;


/**
 *读取基础配置文件
 */
async function readBaseConfig() {
    let baseConfigJson;
    let baseConfigFile = path.resolve(".", "behavior.json");

    if (!fs.existsSync(baseConfigFile)) {
        baseConfig = {configFile: "_config.json", workPath: "_tree"};
        baseConfigJson = JSON.stringify(baseConfig, null, 4);
        await fs.promises.writeFile(baseConfigFile, baseConfigJson);
    } else {
        baseConfigJson = (await fs.promises.readFile(baseConfigFile)).toString();
        baseConfig = JSON.parse(baseConfigJson);
    }

    workPath = path.resolve(".", baseConfig.workPath);
    if (!fs.existsSync(workPath)) {
        await fs.promises.mkdir(workPath);
    }
}

ipcMain.handle("load-config", async () => {
    await readBaseConfig();

    let configFile = path.resolve(".", "_config.json");
    if (!fs.existsSync(configFile)) {
        await fs.promises.writeFile(configFile, JSON.stringify(defaultConfig, null, 4));
    }

    configFile = path.resolve(".", baseConfig.configFile);
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