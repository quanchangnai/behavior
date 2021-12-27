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

let behavior = {
    async addWorkspace(workspaces, workspace, loading) {
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
            workspaces.splice(0, 0, workspace)
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
            this.openWorkspace(dialogResult.filePaths[0]);
        }
    },
    openWorkspace(workspace) {
        openingWorkspace = workspace;

        let webContentsId = workspaces2WebContents.get(openingWorkspace);
        if (webContentsId) {
            openingWorkspace = null;
            let browserWindow = BrowserWindow.fromWebContents(webContents.fromId(webContentsId));
            browserWindow.moveTop();
            browserWindow.focus();
        } else {
            app.emit("create-window");
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
        await behavior.addWorkspace(homeWorkspaces, workspace, true);
    }

    await save();
}


app.on("ready", async () => {
    await load();
    app.emit("create-window");
});

app.on("browser-window-created", async (event, window) => {
    if (openingWorkspace) {
        await behavior.addWorkspace(homeWorkspaces, openingWorkspace);
        openingWorkspace = null;
        await save();
    }

    for (let workspace of behavior.getAllWorkspaces()) {
        if (workspaces2WebContents.has(workspace)) {
            continue;
        }

        webContents2Workspaces.set(window.webContents.id, workspace);
        workspaces2WebContents.set(workspace, window.webContents.id);

        window.on("close", () => {
            workspaces2WebContents.delete(webContents2Workspaces.get(window.webContents.id));
            webContents2Workspaces.delete(window.webContents.id);
        });

        break;
    }
});

export default behavior
