import {app, dialog, shell, BrowserWindow, webContents} from 'electron'
import path from "path";
import fs from "fs";
import config from "./config";

//程序目录下配置的工作区
let appWorkspaces = [];
//系统用户目录下记录用户手动打开的工作区
let homeWorkspaces = [];
//用户正在打开的工作区，此时窗口还未创建成功
let openingWorkspace = null;
let webContents2Workspaces = new Map();
let workspaces2WebContents = new Map();

//工作区对应的窗口标题
let workspaces2Titles = new Map();

let behavior = {
    async addWorkspace(workspaces, workspace, loading) {
        console.log("addWorkspace:", loading);
        await this.createWorkspace(workspace);

        if (appWorkspaces.indexOf(workspace) >= 0) {
            return;
        }

        if (loading === true) {
            workspaces.push(workspace);
        } else {
            let index = workspaces.indexOf(workspace);
            if (index >= 0) {
                workspaces.splice(index, 1);
            }
            workspaces.splice(0, 0, workspace);
        }

        if (workspaces === homeWorkspaces && workspaces.length > 5) {
            homeWorkspaces.pop();
        }

    },
    async createWorkspace(workspace) {
        if (!fs.existsSync(workspace)) {
            await fs.promises.mkdir(workspace);
        }

        let configFile = path.resolve(workspace, "_config.json");
        if (!fs.existsSync(configFile)) {
            await fs.promises.writeFile(configFile, JSON.stringify(config, null, 4));
        }
    },
    /**
     * @returns {String}
     */
    getWorkspace(webContents) {
        return webContents2Workspaces.get(webContents.id);
    },
    getAllWorkspaces() {
        return [...appWorkspaces, ...homeWorkspaces];
    },
    getWorkspacesTitles() {
        return workspaces2Titles;
    },
    async openWorkspacePath(webContents) {
        await shell.openPath(this.getWorkspace(webContents));
    },
    getConfigFile(webContents) {
        return path.resolve(this.getWorkspace(webContents), "_config.json");
    },
    async showOpenWorkspaceDialog(window) {
        let dialogResult = await dialog.showOpenDialog(window, {
            title: "打开工作区",
            buttonLabel: "选择",
            properties: ["openDirectory"]
        });

        if (!dialogResult.canceled) {
            await this.openWorkspace(dialogResult.filePaths[0]);
        }
    },
    async openWorkspace(workspace) {
        openingWorkspace = workspace;
        await behavior.addWorkspace(homeWorkspaces, openingWorkspace);
        buildWorkspacesTitles();

        let webContentsId = workspaces2WebContents.get(openingWorkspace);
        if (webContentsId) {
            openingWorkspace = null;
            let browserWindow = BrowserWindow.fromWebContents(webContents.fromId(webContentsId));
            browserWindow.moveTop();
            browserWindow.focus();
        } else {
            app.emit("open-workspace");
        }
    }
};

async function save() {
    let homeBehaviorFile = path.resolve(app.getPath("home"), "behavior", "behavior.json");
    let json = JSON.stringify({workspaces: [...homeWorkspaces]}, null, 4);
    await fs.promises.writeFile(homeBehaviorFile, json);
}

async function load() {
    //程序目录
    let appBehaviorFile = path.resolve(".", "behavior.json");
    if (fs.existsSync(appBehaviorFile)) {
        let json = (await fs.promises.readFile(appBehaviorFile)).toString();
        let appBehavior = JSON.parse(json);
        for (let workspace of appBehavior.workspaces) {
            workspace = path.resolve(".", workspace);
            await behavior.addWorkspace(appWorkspaces, path.resolve(".", workspace), true);
        }
    }

    //系统用户目录
    let homeBehaviorPath = path.resolve(app.getPath("home"), "behavior");
    if (!fs.existsSync(homeBehaviorPath)) {
        await fs.promises.mkdir(homeBehaviorPath);
    }

    let homeBehaviorFile = path.resolve(homeBehaviorPath, "behavior.json");
    let homeBehavior;

    if (!fs.existsSync(homeBehaviorFile)) {
        homeBehavior = {workspaces: [path.resolve(homeBehaviorPath, "workspace")]};
    } else {
        let json = (await fs.promises.readFile(homeBehaviorFile)).toString();
        homeBehavior = JSON.parse(json);
    }

    for (let workspace of homeBehavior.workspaces) {
        workspace = path.resolve(homeBehaviorPath, workspace);
        await behavior.addWorkspace(homeWorkspaces, workspace, true);
    }

    await behavior.openWorkspace(behavior.getAllWorkspaces()[0]);
}

app.on("ready", load);

app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        await behavior.openWorkspace(behavior.getAllWorkspaces()[0]);
    }
});

app.on("browser-window-created", async (event, window) => {
    webContents2Workspaces.set(window.webContents.id, openingWorkspace);
    workspaces2WebContents.set(openingWorkspace, window.webContents.id);
    openingWorkspace = null;

    window.on("close", () => {
        workspaces2WebContents.delete(webContents2Workspaces.get(window.webContents.id));
        webContents2Workspaces.delete(window.webContents.id);
    });

    await save();
});

function buildWorkspacesTitles() {
    workspaces2Titles.clear();
    let workspaces = behavior.getAllWorkspaces();

    let basename2Workspaces = new Map();
    for (let workspace of workspaces) {
        let basename = path.basename(workspace);
        if (!basename2Workspaces.has(basename)) {
            basename2Workspaces.set(basename, []);
        }
        basename2Workspaces.get(basename).push(workspace);
    }

    for (let workspace of workspaces) {
        let basename = path.basename(workspace);
        let dirname = path.dirname(workspace);

        if (basename2Workspaces.get(basename).length < 2) {
            workspaces2Titles.set(workspace, basename);
            continue
        }

        if (Buffer.byteLength(dirname) > 14) {
            let removedCount = 0;
            let removePos = -1;
            while (Buffer.byteLength(dirname) > 8) {
                removePos = dirname.length / 2;
                dirname = dirname.substr(0, removePos) + dirname.substr(removePos + 1, dirname.length - 1);
                removedCount++;
            }
            if (removePos > 0) {
                dirname = dirname.substr(0, removePos)
                    + ".." + removedCount + ".." +
                    dirname.substr(removePos, dirname.length - 1);
            }
        }

        workspaces2Titles.set(workspace, path.resolve(dirname, basename));
    }

}

export default behavior
