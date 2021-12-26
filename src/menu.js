import {app, Menu, shell} from "electron";
import behavior from "@/behavior";

const menu = Menu.buildFromTemplate([
    {
        label: "文件",
        submenu: [
            {
                label: '打开工作目录',
                accelerator: "Alt+E",
                click: async (item, window) => {
                    await shell.openPath(behavior.getWorkspace(window.webContents));
                }
            },
            {
                label: "刷新工作区",
                role: "reload",
                accelerator: "F5",
            },
            {
                label: '打开工作区',
                click: () => {
                    app.emit("open-window");
                }
            },
        ]
    },
    {
        label: "开发者工具",
        role: "toggleDevTools",
        accelerator: "F12",
    }

]);

Menu.setApplicationMenu(menu);