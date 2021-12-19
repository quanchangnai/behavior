//行为树编辑器默认配置
//行为树模板类型
let templateTypes = [
    {id: 1, name: "根节点", childrenTypes: [2], childrenNum: -1},
    {id: 2, name: "状态节点", childrenTypes: [3, 4, 5], childrenNum: -1},
    {id: 3, name: "组合节点", childrenTypes: [3, 4, 5], childrenNum: -1},
    {id: 4, name: "装饰节点", childrenTypes: [3, 4, 5], childrenNum: 1},
    {id: 5, name: "叶子节点", childrenTypes: [], childrenNum: 0},
];

//行为树模板
let templates = [
    {id: 1, name: "根节点", type: 1},
    {id: 2, name: "状态节点", type: 2, desc: "状态节点描述"},
    {id: 3, name: "顺序节点", type: 3, desc: "顺序节点描述"},
    {id: 4, name: "选择节点", type: 3, desc: "选择节点描述"},
    {id: 5, name: "装饰节点1", type: 4, desc: "装饰节点1描述"},
    {id: 6, name: "装饰节点2", type: 4, desc: "装饰节点2描述"},
    {id: 7, name: "动作节点1", type: 5, desc: "动作节点1描述"},
    {id: 8, name: "动作节点2", type: 5, desc: "动作节点2描述"},
    {id: 9, name: "动作节点3", type: 5, desc: "动作节点3描述"},
    {id: 10, name: "条件节点", type: 5, desc: "条件节点描述"},
];

//行为树模板参数
templates[6].params = [
    {name: 'p1', label: '参数1', value: 1},
    {name: 'p2', label: '参数2', value: ''},
    {name: 'p3', label: '参数3', value: true},
];

templates[7].params = [
    {name: 'p1', label: '参数1', value: 1, options: [{label: '选项1', value: 1}, {label: '选项2', value: 2}]},
    {name: 'p2', label: '参数2', value: 'aaa', options: [{label: '选项1', value: 'aaa'}, {label: '选项2', value: 'bbb'}]}
];

//默认行为树，新建时自动创建，不能为空
let defaultTree = {
    id: 1,
    name: "新建行为树",
    root: {
        id: 1,
        name: "",
        tid: 1,
        children: [
            {id: 2, name: "", tid: 2}
        ]
    }
};

export default {templateTypes, templates, defaultTree};