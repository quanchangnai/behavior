import {app, Menu, shell} from "electron";
import path from "path";
import manager from "./manager";

function checkbox(checked = true) {
    if (process.platform !== 'darwin') {
        return {
            type: "checkbox",
            checked: checked
        }
    } else {
        return {}
    }
}

function buildMenu() {
    const menu = [
        {
            label: "文件",
            submenu: [
                {
                    label: '创建行为树',
                    accelerator: "Alt+C",
                    click: (item, win) => {
                        win.webContents.send("create-tree");
                    }
                },
                {
                    label: '打开工作目录',
                    accelerator: "Alt+E",
                    click: async (item, win) => {
                        await manager.openWorkspacePath(win.webContents)
                    }
                },
                {
                    label: "重加载工作区",
                    role: "reload",
                    accelerator: "F5"
                },
                {
                    label: '打开工作区...',
                    click: async (item, win) => {
                        await manager.showOpenWorkspaceDialog(win);
                    }
                },
                {
                    label: '最近工作区...',
                    click: (item, win) => {
                        win.webContents.send("recent-workspaces", manager.getRecentWorkspaces());
                    }
                }
            ]
        },
        {
            label: "编辑",
            submenu: [
                {
                    label: "撤销",
                    accelerator: "CmdOrCtrl+Z",
                    click: (item, win) => {
                        win.webContents.send("undo");
                    }
                },
                {
                    label: "重做",
                    accelerator: "CmdOrCtrl+Shift+Z",
                    click: (item, win) => {
                        win.webContents.send("redo");
                    }
                },
                {
                    label: "剪切子树",
                    role: "cut"
                },
                {
                    label: "剪切节点",
                    accelerator: "CmdOrCtrl+Shift+X",
                    click: (item, win) => {
                        win.webContents.send("cut-nodes");
                    }
                },
                {
                    label: "复制子树",
                    role: "copy"
                },
                {
                    label: "复制节点",
                    accelerator: "CmdOrCtrl+Shift+C",
                    click: (item, win) => {
                        win.webContents.send("copy-nodes");
                    }
                },
                {
                    label: "粘贴",
                    role: "paste"
                },
                {
                    label: "删除子树",
                    accelerator: "Delete",
                    click: (item, win) => {
                        win.webContents.send("delete-subtrees");
                    }
                },
                {
                    label: "删除节点",
                    accelerator: "CmdOrCtrl+Delete",
                    click: (item, win) => {
                        win.webContents.send("delete-nodes");
                    }
                }
            ]
        },
        {
            label: "视图",
            submenu: [
                {
                    label: "行为树列表",
                    ...checkbox(),
                    accelerator: "CmdOrCtrl+Left",
                    click(item, win) {
                        win.webContents.send("toggle-tree-list");
                    }
                },
                {
                    label: "节点模板列表",
                    ...checkbox(),
                    accelerator: "CmdOrCtrl+Right",
                    click(item, win) {
                        win.webContents.send("toggle-template-list");
                    }
                },
                {
                    label: "展开全部节点",
                    click(item, win) {
                        win.webContents.send("fold-all-nodes", false);
                    },
                    accelerator: "CmdOrCtrl+Down"
                },
                {
                    label: "收起全部节点",
                    accelerator: "CmdOrCtrl+Up",
                    click(item, win) {
                        win.webContents.send("fold-all-nodes", true);
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
                    label: "文档",
                    async click() {
                        await shell.openExternal(path.resolve(path.dirname(app.getPath("exe")), "README.html"));
                    },
                    visible: app.isPackaged
                },
                {
                    label: "日志",
                    async click() {
                        await shell.openPath(path.resolve(app.getPath("userData"), "logs"));
                    }
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

    return Menu.buildFromTemplate(menu)
}

Menu.setApplicationMenu(buildMenu());

app.on("browser-window-created", (event, win) => {
    if (win.setMenu) {
        win.setMenu(buildMenu());
    }
});

