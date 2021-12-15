import {ipcMain} from 'electron'
import fs from 'fs'
import path from 'path'

ipcMain.handle("dev-tools", event => {
    if (event.sender.isDevToolsOpened()) {
        event.sender.closeDevTools();
    } else {
        event.sender.openDevTools();
    }
});


ipcMain.handle("load-config", async () => {
    let templateTypes = [
        {id: 1, name: "根节点", childrenTypes: [2], childrenNum: -1},
        {id: 2, name: "状态节点", childrenTypes: [3, 4, 5], childrenNum: -1},
        {id: 3, name: "组合节点", childrenTypes: [3, 4, 5], childrenNum: -1},
        {id: 4, name: "装饰节点", childrenTypes: [3, 4, 5], childrenNum: 1},
        {id: 5, name: "叶子节点", childrenTypes: [], childrenNum: 0},
    ];

    let templates = [
        {id: 1, name: "根节点", type: 1},
        {id: 2, name: "状态节点", type: 2},
        {id: 3, name: "顺序节点", type: 3},
        {id: 4, name: "选择节点", type: 3},
        {id: 5, name: "装饰节点1", type: 4},
        {id: 6, name: "装饰节点2", type: 4},
        {id: 7, name: "装饰节点1", type: 5},
        {id: 8, name: "动作节点2", type: 5},
        {id: 9, name: "动作节点3", type: 5},
    ];

    //新建行为树时自动创建的样例
    let example = {
        id: 1,
        name: "新建行为树",
        root: {
            id: 1, name: "",
            tid: 1,
            children: [
                {id: 2, name: "", tid: 2}
            ]
        }
    };

    let config = {templateTypes, templates, example};

    for (let template of config.templates) {
        template.type = templateTypes.find(t => t.id === template.type);
    }

    return config;
});

ipcMain.handle("load-trees", async () => {
    return [
        {
            id: 1,
            name: "测试1",
            root: {
                id: 1, name: "", tid: 1, collapsed: false,
                children: [
                    {id: 2, name: "状态1", tid: 2, collapsed: false},
                    {
                        id: 3, tid: 3, collapsed: false,
                        children: [
                            {
                                id: 5, name: "", tid: 4, collapsed: false,
                                children: [
                                    {
                                        id: 6, tid: 3, collapsed: false,
                                        children: [
                                            {
                                                id: 7, tid: 4, collapsed: false,
                                                children: [
                                                    {
                                                        id: 8, tid: 3, collapsed: false,
                                                        children: [
                                                            {id: 9, tid: 5, collapsed: false},
                                                            {id: 10, tid: 6, collapsed: false},
                                                        ]
                                                    },
                                                ]
                                            },
                                        ]
                                    },
                                ]
                            },
                        ]
                    },
                    {id: 4, name: "状态2", tid: 2, collapsed: false},
                ]
            }
        },
        {
            id: 2,
            name: "测试2",
            root: {
                id: 1, name: "", tid: 1, collapsed: false,
                children: [
                    {id: 2, name: "", tid: 2, collapsed: false},
                ]
            }
        }
    ];
});


ipcMain.handle("save-tree", async (event, tree) => {
    console.log("save-tree:" + fs.constants.F_OK);
    console.log(JSON.stringify(tree, null, 4));
    let workPath = path.resolve("./");

    let result = {__dirname, __filename, workPath};
    console.log(JSON.stringify(result));
    return result
});