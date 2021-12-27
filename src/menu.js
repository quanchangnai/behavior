import {app, Menu} from "electron";
import behavior from "@/behavior";
import path from "path";

function buildRecentMenu() {
    let openRecentWorkspaces = {
        id: "openRecentWorkspaces",
        label: "打开最近工作区",
        submenu: []
    };

    let allWorkspaces = behavior.getAllWorkspaces();
    if (allWorkspaces.length === 0) {
        openRecentWorkspaces.visible = false;
    }

    let basename2Workspaces = new Map();
    for (let workspace of allWorkspaces) {
        let basename = path.basename(workspace);
        if (!basename2Workspaces.has(basename)) {
            basename2Workspaces.set(basename, []);
        }
        basename2Workspaces.get(basename).push(workspace);
    }

    for (let workspace of allWorkspaces) {
        let basename = path.basename(workspace);
        let label = basename;
        if (basename2Workspaces.get(basename).length > 1) {
            label = workspace;
        }
        openRecentWorkspaces.submenu.push({
            id: workspace,
            label: label,
            click: () => behavior.openWorkspace(workspace)
        });
    }

    return openRecentWorkspaces;
}

function buildMenu() {
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
                    label: '打开工作区',
                    click: async (item, window) => {
                        await behavior.showOpenWorkspaceDialog(window);
                    }
                },
                buildRecentMenu()
            ]
        },
        {
            label: "工具",
            submenu: [
                {
                    label: "开发者工具",
                    role: "toggleDevTools",
                    accelerator: "F12",
                }
            ]
        }
    ];
}

app.on("browser-window-created", (event, window) => {
    let menu = Menu.buildFromTemplate(buildMenu());
    window.setMenu(menu);
});

