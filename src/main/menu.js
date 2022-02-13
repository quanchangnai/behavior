import {app, Menu, shell} from "electron";
import path from "path";
import behavior from "./behavior";

let menu = [
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
                    await behavior.openWorkspacePath(win.webContents)
                }
            },
            {
                label: '打开工作区',
                click: async (item, win) => {
                    await behavior.showOpenWorkspaceDialog(win);
                }
            },
            {
                label: '最近工作区',
                click: (item, win) => {
                    win.webContents.send("recent-workspaces", behavior.recentWorkspaces());
                }
            },
        ]
    },
    {
        label: "编辑",
        submenu: [
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
                label: "删除节点",
                accelerator: "Delete",
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
                label: "刷新",
                role: "reload",
                accelerator: "F5"
            },
            {
                label: "行为树列表",
                click(item, win) {
                    win.webContents.send("left-visible");
                },
                accelerator: "CmdOrCtrl+Left"
            },
            {
                label: "节点模板列表",
                accelerator: "CmdOrCtrl+Right",
                click(item, win) {
                    win.webContents.send("right-visible");
                }
            },
            {
                label: "展开全部节点",
                click(item, win) {
                    win.webContents.send("fold-all-node", false);
                },
                accelerator: "CmdOrCtrl+Down"
            },
            {
                label: "收起全部节点",
                accelerator: "CmdOrCtrl+Up",
                click(item, win) {
                    win.webContents.send("fold-all-node", true);
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
                label: "联系",
                async click() {
                    await shell.openExternal("mailto:quanchangnai@126.com")
                }
            }
        ]
    }
];

Menu.setApplicationMenu(Menu.buildFromTemplate(menu));