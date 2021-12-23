import {app, Menu, shell} from "electron";
import behavior from "@/behavior";

let window = null;
app.on("browser-window-created", (event, win) => window = win);

const menu = Menu.buildFromTemplate([
    {
        label: '文件',
        submenu: [
            {
                label: '打开工作目录',
                click: () => shell.openPath(behavior.workPath)
            },
            {
                label: '重加载工作目录',
                click: () => window.webContents.send("reload-trees")
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