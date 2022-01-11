import path from "path";
import fs from "fs";
import {app, dialog, shell, BrowserWindow, webContents} from 'electron'
import logger from "electron-log";
import config from "./config";
import {validateBehavior} from "./validator";

logger.catchErrors();

//程序目录下配置的工作区
let appWorkspaces = [];
//系统用户目录下记录用户手动打开的工作区
let homeWorkspaces = [];
//用户正在打开的工作区，此时窗口还未创建成功
let openingWorkspace = null;
//webContents.id:workspace
let webContentsWorkspaces = new Map();
//workspace:webContents.id
let workspacesWebContents = new Map();
//窗口标题是否使用工作区全路径
let titleUseFullPath = false;
//工作区对应的窗口标题
let workspacesTitles = new Map();

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
        return webContentsWorkspaces.get(webContents.id);
    },
    getAllWorkspaces() {
        return [...appWorkspaces, ...homeWorkspaces];
    },
    getTitle(webContents) {
        let workspace = this.getWorkspace(webContents);
        if (titleUseFullPath) {
            return workspace;
        } else {
            return workspacesTitles.get(workspace)
        }
    },
    getWorkspacesTitles() {
        return workspacesTitles;
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
        workspace = workspace || this.getAllWorkspaces()[0];

        await this.addWorkspace(homeWorkspaces, workspace);
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
            app.emit("open-workspace");
        }
    },
    /**
     * 从命令行参数中解析要打开的工作区
     * @param args {string[]}
     * @returns {string|undefined}
     */
    parseWorkspace(args) {
        if (!app.isPackaged) {
            return;
        }
        for (let i = 1; i < args.length; i++) {
            if (!args[i].startsWith("-")) {
                return path.resolve(".", args[i]);
            }
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
        if (validateBehavior(appBehavior)) {
            titleUseFullPath = titleUseFullPath || appBehavior.titleUseFullPath;
            for (let workspace of appBehavior.workspaces) {
                workspace = path.resolve(".", workspace);
                await behavior.addWorkspace(appWorkspaces, path.resolve(".", workspace), true);
            }
        } else {
            logger.error("app behavior error\n", validateBehavior.errors);
        }
    }

    //系统用户目录
    let homeBehaviorPath = path.resolve(app.getPath("home"), "behavior");
    if (!fs.existsSync(homeBehaviorPath)) {
        await fs.promises.mkdir(homeBehaviorPath);
    }

    let homeBehaviorFile = path.resolve(homeBehaviorPath, "behavior.json");
    let homeBehavior;

    if (fs.existsSync(homeBehaviorFile)) {
        let json = (await fs.promises.readFile(homeBehaviorFile)).toString();
        homeBehavior = JSON.parse(json);
        if (!validateBehavior(homeBehavior)) {
            homeBehavior = null;
            logger.error("home behavior error\n", validateBehavior.errors);
        }
    }

    if (!homeBehavior) {
        homeBehavior = {workspaces: [path.resolve(homeBehaviorPath, "workspace")]};
    }

    for (let workspace of homeBehavior.workspaces) {
        workspace = path.resolve(homeBehaviorPath, workspace);
        await behavior.addWorkspace(homeWorkspaces, workspace, true);
    }

    let workspace = behavior.parseWorkspace(process.argv) || behavior.getAllWorkspaces()[0];
    await behavior.openWorkspace(workspace);
}

app.on("ready", load);

app.on("browser-window-created", async (event, window) => {
    webContentsWorkspaces.set(window.webContents.id, openingWorkspace);
    workspacesWebContents.set(openingWorkspace, window.webContents.id);
    openingWorkspace = null;

    window.on("close", () => {
        workspacesWebContents.delete(webContentsWorkspaces.get(window.webContents.id));
        webContentsWorkspaces.delete(window.webContents.id);
    });

    await save();
});

function buildWorkspacesTitles() {
    workspacesTitles.clear();
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
            workspacesTitles.set(workspace, basename);
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

        workspacesTitles.set(workspace, path.resolve(dirname, basename));
    }

}

export default behavior
