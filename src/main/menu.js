import {app, BrowserWindow, Menu, shell} from "electron";
import path from "path";
import behavior from "./behavior";

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
                ...workspacesItems,
                {
                    label: '管理工作区',
                    click: (item, window) => {
                        window.webContents.send("manage-workspaces", behavior.manageWorkspaces());
                    }
                },
            ]
        },
        {
            label: "视图",
            submenu: [
                {
                    label: "刷新",
                    role: "reload",
                    accelerator: "F5",
                },
                {
                    label: "行为树列表",
                    click(item, window) {
                        window.webContents.send("left-visible");
                    },
                    accelerator: "CommandOrControl+Left"
                },
                {
                    label: "节点模板列表",
                    click(item, window) {
                        window.webContents.send("right-visible");
                    },
                    accelerator: "CommandOrControl+Right"
                },
                {
                    label: "展开全部节点",
                    click(item, window) {
                        window.webContents.send("fold-all-node", false);
                    },
                    accelerator: "CommandOrControl+Down"
                },
                {
                    label: "收起全部节点",
                    click(item, window) {
                        window.webContents.send("fold-all-node", true);
                    },
                    accelerator: "CommandOrControl+Up"
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
                    label: "文档",
                    async click() {
                        await shell.openExternal(path.resolve(".", "README.html"));
                    },
                    visible: app.isPackaged
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

export function resetMenus() {
    for (let win of BrowserWindow.getAllWindows()) {
        if (!win.setMenu) {
            return;
        }
        let menu = Menu.buildFromTemplate(buildMenu());
        let menuItem = menu.getMenuItemById(behavior.getWorkspace(win.webContents));
        menuItem.visible = false;
        win.setMenu(menu);
    }
}

app.on("browser-window-created", () => {
    setTimeout(resetMenus, 10);
});