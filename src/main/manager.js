import path from "path";
import fs from "fs";
import {app, dialog, shell, BrowserWindow, webContents} from 'electron'
import logger from "electron-log";
import config from "./config";

logger.catchErrors();

//记录最近打开过的工作区
let recentWorkspaces = [];
//用户正在打开的工作区，此时窗口还未创建成功
let openingWorkspace = null;
//webContents.id:workspace
let webContentsWorkspaces = new Map();
//workspace:webContents.id
let workspacesWebContents = new Map();
//工作区对应的窗口标题
let workspacesTitles = new Map();

let manager = {
    async addWorkspace(workspace, loading) {
        if (loading) {
            recentWorkspaces.push(workspace);
        } else {
            let index = recentWorkspaces.indexOf(workspace);
            if (index >= 0) {
                recentWorkspaces.splice(index, 1);
            }
            recentWorkspaces.splice(0, 0, workspace);
        }

        if (recentWorkspaces.length > 10) {
            recentWorkspaces.pop();
        }
    },
    /**
     * 获取webContents对应的工作区
     * @param webContents
     * @returns {String}
     */
    getWorkspace(webContents) {
        return webContentsWorkspaces.get(webContents.id);
    },
    sendTitle(webContents) {
        let title = "behavior - " + workspacesTitles.get(this.getWorkspace(webContents));
        webContents.send("title", title);
    },
    getConfigFile(webContents) {
        return path.resolve(this.getWorkspace(webContents), "behavior.config.json");
    },
    async showOpenWorkspaceDialog(window) {
        let dialogResult = await dialog.showOpenDialog(window, {
            title: "behavior - 打开工作区", buttonLabel: "选择", properties: ["openDirectory"]
        });

        if (!dialogResult.canceled) {
            await this.openWorkspace(dialogResult.filePaths[0]);
        }

        return !dialogResult.canceled;
    },
    async createWorkspace(workspace) {
        if (!fs.existsSync(workspace)) {
            await fs.promises.mkdir(workspace, {recursive: true});
        }

        let configFile = path.resolve(workspace, "behavior.config.json");
        if (!fs.existsSync(configFile)) {
            await fs.promises.writeFile(configFile, JSON.stringify(config, null, 4));
        }
    },
    async openWorkspace(workspace) {
        if (!workspace && recentWorkspaces.length > 0) {
            workspace = recentWorkspaces[0];
        }
        if (!workspace) {
            return await this.showOpenWorkspaceDialog();
        }

        await this.addWorkspace(workspace);
        await this.createWorkspace(workspace);
        buildWorkspacesTitles();

        let webContentsId = workspacesWebContents.get(workspace);
        if (webContentsId) {
            let win = BrowserWindow.fromWebContents(webContents.fromId(webContentsId));
            if (win.isMinimized()) {
                win.restore();
            }
            win.moveTop();
            win.focus();
        } else {
            openingWorkspace = workspace;
            await this.createWindow();
        }

        return true;
    },
    /**
     * 从命令行参数中解析要打开的工作区
     * @param args {string[]}
     * @param basePath {string}
     * @returns {string|undefined}
     */
    parseWorkspace(args, basePath = ".") {
        for (let i = 1; i < args.length; i++) {
            if (args[i].startsWith("-w=")) {
                let workspace = args[i].substring(args[i].indexOf("=") + 1);
                if (workspace && workspace.trim() !== "") {
                    return path.resolve(basePath, workspace.trim());
                }
            }
        }
    },
    getRecentWorkspaces() {
        let workspaces = [];
        for (let workspace of recentWorkspaces) {
            workspaces.push({path: workspace, deletable: !workspacesWebContents.has(workspace)})
        }
        return workspaces;
    },
    deleteWorkspace(workspace) {
        recentWorkspaces.splice(recentWorkspaces.indexOf(workspace), 1);
        workspacesTitles.delete(workspace);
        // noinspection JSIgnoredPromiseFromCall
        save();
    },
    async openWorkspacePath(webContents, treeName) {
        let workspace = this.getWorkspace(webContents);
        treeName = treeName || this.selectedTree;
        if (treeName) {
            shell.showItemInFolder(path.resolve(workspace, treeName + ".json"));
        } else {
            await shell.openPath(workspace);
        }
    },
};

async function save() {
    let workspacesFile = path.resolve(app.getPath("userData"), "workspaces.json");
    let workspacesStr = JSON.stringify(recentWorkspaces, null, 4);
    await fs.promises.writeFile(workspacesFile, workspacesStr);
}

async function load() {
    //系统用户目录 recentWorkspaces
    let workspacesFile = path.resolve(app.getPath("userData"), "workspaces.json");
    let workspaces = [];

    if (fs.existsSync(workspacesFile)) {
        let json = (await fs.promises.readFile(workspacesFile)).toString();
        workspaces = JSON.parse(json);
    }

    for (let workspace of workspaces) {
        await manager.addWorkspace(workspace, true);
    }

    let workspace = manager.parseWorkspace(process.argv);
    if (!await manager.openWorkspace(workspace)) {
        app.quit();
    }
}

app.on("ready", load);

app.on("browser-window-created", async (event, window) => {
    if (openingWorkspace) {
        webContentsWorkspaces.set(window.webContents.id, openingWorkspace);
        workspacesWebContents.set(openingWorkspace, window.webContents.id);
        openingWorkspace = null;
    }

    window.on("close", () => {
        workspacesWebContents.delete(webContentsWorkspaces.get(window.webContents.id));
        webContentsWorkspaces.delete(window.webContents.id);
    });

    await save();
});

function buildWorkspacesTitles() {
    workspacesTitles.clear();

    let basename2Workspaces = new Map();
    for (let workspace of recentWorkspaces) {
        let basename = path.basename(workspace);
        if (!basename2Workspaces.has(basename)) {
            basename2Workspaces.set(basename, []);
        }
        basename2Workspaces.get(basename).push(workspace);
    }

    for (let workspace of recentWorkspaces) {
        let basename = path.basename(workspace);
        if (basename2Workspaces.get(basename).length <= 1) {
            workspacesTitles.set(workspace, basename);
        } else {
            workspacesTitles.set(workspace, workspace);
        }
        let webContentsId = workspacesWebContents.get(workspace);
        if (webContentsId) {
            manager.sendTitle(webContents.fromId(webContentsId));
        }
    }
}

export default manager
