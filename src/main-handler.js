import {ipcMain, shell} from 'electron'
import behavior from "@/behavior";
import fs from 'fs'
import path from 'path'


ipcMain.handle("load-config", async () => {
    let configJson = (await fs.promises.readFile(behavior.configFile)).toString();
    return JSON.parse(configJson);
});

ipcMain.handle("load-trees", async event => {
        let files = await fs.promises.readdir(behavior.workPath);
        let trees = [];

        for (let file of files) {
            let fileName = path.resolve(behavior.workPath, file);
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
    let treeJson = JSON.stringify(tree, null, 4);
    let treeFile = path.resolve(behavior.workPath, tree.id + ".json");
    await fs.promises.writeFile(treeFile, treeJson, {encoding: "utf-8"});
});

ipcMain.handle("delete-tree", async (event, treeId) => {
    let treeFile = path.resolve(behavior.workPath, treeId + ".json");
    await fs.promises.unlink(treeFile);
});

ipcMain.handle("open-work-path", async () => {
    await shell.openPath(behavior.workPath);
});


