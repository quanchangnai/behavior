import {Menu, shell} from "electron";
import behavior from "@/behavior";

const menu = Menu.buildFromTemplate([
    {
        label: '文件',
        submenu: [
            {
                label: '打开工作目录',
                accelerator: "Alt+E",
                click: () => shell.openPath(behavior.workPath)
            },
            {
                label: '重加载工作目录',
                accelerator: "Alt+R",
                click: (item, window) => window.webContents.send("reload-trees")
            }
        ]
    },
    {
        label: '刷新',
        role: "reload",
        accelerator: "F5"
    },
    {
        label: '控制台',
        role: "toggleDevTools",
        accelerator: "F12"
    }]);

Menu.setApplicationMenu(menu);