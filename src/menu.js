import {app, BrowserWindow, ipcMain, Menu, shell} from "electron";
import behavior from "@/behavior";

function buildMenu() {
    let workspacesItems = [];
    let workspacesTitles = behavior.getWorkspacesTitles();

    for (let workspace of workspacesTitles.keys()) {
        workspacesItems.push({
            id: workspace,
            label: "打开工作区：" + workspacesTitles.get(workspace),
            click: () => behavior.openWorkspace(workspace)
        });
    }

    return [
        {
            label: "文件",
            submenu: [
                {
                    label: '创建行为树',
                    accelerator: "Alt+C",
                    click: (item, window) => {
                        window.webContents.send("create-tree");
                    }
                },
                {
                    label: "刷新工作区",
                    role: "reload",
                    accelerator: "F5",
                },
                {
                    label: '打开工作目录',
                    accelerator: "Alt+E",
                    click: async (item, window) => {
                        await behavior.openWorkspacePath(window.webContents);
                    }
                },
                {
                    label: '打开工作区...',
                    click: async (item, window) => {
                        await behavior.showOpenWorkspaceDialog(window);
                    }
                },
                ...workspacesItems
            ]
        },
        {
            label: "视图",
            submenu: [
                {
                    label: "隐藏树列表",
                    click(item, window) {
                        window.webContents.send("leftVisible", false);
                    }
                },
                {
                    label: "隐藏模板列表",
                    click(item, window) {
                        window.webContents.send("rightVisible", false);
                    }
                },
                {
                    label: "开发者工具",
                    role: "toggleDevTools",
                    accelerator: "F12",
                }
            ]
        },
        {
            label: "帮助",
            submenu: [
                {
                    label: "关于",
                    role: "about"
                },
                {
                    label: "联系",
                    async click() {
                        await shell.openExternal("mailto:quanchangnai@126.com")
                    }
                }
            ]
        }
    ];
}

// noinspection JSCheckFunctionSignatures
app.on("open-workspace", () => {
    let menu = Menu.buildFromTemplate(buildMenu());
    Menu.setApplicationMenu(menu);
});

app.on("browser-window-created", (event, window) => {
    if (!window.setMenu) {
        return;
    }

    let allWindows = [...BrowserWindow.getAllWindows(), window];
    for (let win of allWindows) {
        let menu = Menu.buildFromTemplate(buildMenu());
        let menuItem = menu.getMenuItemById(behavior.getWorkspace(win.webContents));
        menuItem.visible = false;
        win.setMenu(menu);
        win.$menu = menu;
    }
});

ipcMain.handle("title", event => {
    let win = BrowserWindow.fromWebContents(event.sender);
    // noinspection JSUnresolvedVariable
    if (!win.$menu) {
        return;
    }
    let title = behavior.getWorkspacesTitles().get(behavior.getWorkspace(win.webContents));
    return win.getTitle() + " - " + title;
});