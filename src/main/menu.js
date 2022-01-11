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
                ...workspacesItems
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
                        window.webContents.send("leftVisible");
                    },
                    accelerator: "CommandOrControl+Left"
                },
                {
                    label: "节点模板列表",
                    click(item, window) {
                        window.webContents.send("rightVisible");
                    },
                    accelerator: "CommandOrControl+Right"
                },
                {
                    label: "展开全部节点",
                    click(item, window) {
                        window.webContents.send("foldAllNode", false);
                    },
                    accelerator: "CommandOrControl+Down"
                },
                {
                    label: "收起全部节点",
                    click(item, window) {
                        window.webContents.send("foldAllNode", true);
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
    }
});