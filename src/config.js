//行为树编辑器默认配置
//节点模板类型，用于控制节点连接性和子节点数量
let templateTypes = [
    {id: 1, name: "根节点", childrenTypes: [2], childrenNum: -1},
    {id: 2, name: "状态节点", childrenTypes: [3, 4, 5], childrenNum: -1},
    {id: 3, name: "组合节点", childrenTypes: [3, 4, 5], childrenNum: -1},
    {id: 4, name: "装饰节点", childrenTypes: [3, 4, 5], childrenNum: 1},
    {id: 5, name: "叶子节点", childrenTypes: [], childrenNum: 0},
];

//可选的节点模板组，用于搜索筛选
let templateGroups = [
    {id: 1, name: "基础节点"},
    {id: 2, name: "逻辑节点1"},
    {id: 3, name: "逻辑节点2"},
];

//节点模板
let templates = [
    {id: 1, name: "根节点", type: 1},
    {id: 2, name: "状态节点", type: 2, group: 1, desc: "状态节点描述"},
    {id: 3, name: "顺序节点", type: 3, group: 1, desc: "顺序节点描述"},
    {id: 4, name: "选择节点", type: 3, group: 1, desc: "选择节点描述"},
    {id: 5, name: "装饰节点1", type: 4, group: 1, desc: "装饰节点1描述"},
    {id: 6, name: "装饰节点2", type: 4, group: 1, desc: "装饰节点2描述"},
    {id: 7, name: "动作节点1", type: 5, group: 2, desc: "动作节点1描述,动作节点1描述,\n动作节点1描述,动作节点1描述,\n动作节点1描述"},
    {id: 8, name: "动作节点2", type: 5, group: 2, desc: "动作节点2描述"},
    {id: 9, name: "动作节点3", type: 5, group: 3, desc: "动作节点3描述"},
    {id: 10, name: "条件节点1", type: 5, group: 2, desc: "条件节点1描述"},
    {id: 11, name: "条件节点2", type: 5, group: 3, desc: "条件节点2描述"},
    {id: 12, name: "条件执行节点", type: 3, group: 3, desc: "条件执行节点描述", childrenNum: 3},//可以选择覆盖模板类型的childrenNum
];

//模板参数
//动作节点1参数
templates[6].params = {
    p1: {label: '参数1', value: 1},//整数
    p2: {label: '参数2', value: '', pattern: '^[abc]*$'},//字符串,可选的正则格式
    p3: {label: '参数3', value: true},//boolean
    p4: {label: '参数4', value: 2, precision: 0, min: 0, max: 100},//可选的精度和取值范围
};

//动作节点2参数
templates[7].params = {
    p1: {label: '参数1', value: 1, options: [{label: '选项1-1', value: 1}, {label: '选项1-2', value: 2}]},
    p2: {label: '参数2', value: 'aaa', options: [{label: '选项2-1', value: 'aaa'}, {label: '选项2-2', value: 'bbb'}]},//单选
    p3: {label: '参数3', value: ['aaa'], options: [{label: '选项3-1', value: 'aaa'}, {label: '选项3-2', value: 'bbb'}]},//多选
};

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
        ],
        childrenFolded: false
    }
};

export default {templateTypes, templateGroups, templates, defaultTree};