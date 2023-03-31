# behavior

behavior是一款可自由定制的可视化行为树编辑器

## 启动

点击程序路径下的behavior.exe启动，或者通过命令行执行"behavior.exe -w=w1"启动，\
参数w1是要打开的工作区路径，后续编辑的行为树都会以json文件格式保存在该路径中

## 编辑器配置

编辑器配置主要用来告诉编辑器如何编辑行为树，主要是节点模板配置 \
第一次打开工作区时会在目录下自动创建配置文件behavior.config.json，\
该文件是一个JSON对象，可以按需求修改，包含以下四个要素：

```json
{
  "templateTypes": [],
  "templateGroups": [],
  "templates": [],
  "archetypes": []
}
```

### templateTypes

节点模板类型，主要用于控制节点连接性和子节点数量，可选字段

```js
//节点模板类型示例
templateTypes = [
    {id: 1, name: "根节点", childrenTypes: [2], childrenNum: -1},
    {id: 2, name: "状态节点", childrenTypes: [3, 4, 5], childrenNum: -1},
    {id: 3, name: "组合节点", childrenTypes: [3, 4, 5], childrenNum: -1},
    {id: 4, name: "装饰节点", childrenTypes: [3, 4, 5], childrenNum: 1},
    {id: 5, name: "叶子节点", childrenTypes: [], childrenNum: 0},
];
```

childrenTypes:限制子节点的模板类型,类型不合法的节点不允许作为子节点挂载 \
childrenNum:限制子节点的数量，-1:不限制,0:不允许挂子节点，大于0:最多能挂的子节点数量 \

### templateGroups

节点模板组，用于搜索筛选逻辑，可选字段

```js
//节点模板组示例
templateGroups = [
    {id: 1, name: "基础节点"},
    {id: 2, name: "逻辑节点1"},
    {id: 3, name: "逻辑节点2"},
];
```

### templates

节点模板，行为树的每一个节点都是以此为模板创建的

```js
//节点模板示例
let templates = [
    {id: 1, name: "根节点", type: 1},
    {id: 2, name: "状态节点", type: 2, group: 1, desc: "状态节点描述"},
    {id: 3, name: "顺序节点", type: 3, group: 1, desc: "顺序节点描述"},
    {id: 4, name: "选择节点", type: 3, group: 1, desc: "选择节点描述"},
    {id: 5, name: "装饰节点1", type: 4, group: 1, desc: "装饰节点1描述"},
    {id: 6, name: "装饰节点2", type: 4, group: 1, desc: "装饰节点2描述"},
    {id: 7, name: "动作节点1", type: 5, group: 2, desc: "动作节点1描述,动作节点1描述,\n动作节点1描述,动作节点1描述"},
    {id: 8, name: "动作节点2", type: 5, group: 2, desc: "动作节点2描述"},
    {id: 9, name: "动作节点3", type: 5, group: 3, desc: "动作节点3描述"},
    {id: 10, name: "条件节点1", type: 5, group: 2, desc: "条件节点1描述"},
    {id: 11, name: "条件节点2", type: 5, group: 3, desc: "条件节点2描述"},
    {id: 12, name: "条件执行节点", type: 3, group: 3, desc: "条件执行节点描述", childrenTypes: [3, 4, 5], childrenNum: 3},
    {id: 13, name: "切换状态节点", type: 5, group: 1, desc: "切换状态节点描述", childrenIds: []},
];
```

id:节点模板ID，正整数或字符串 \
name:节点模板名称 \
desc:可选字段，节点模板描述 \
type:可选字段，节点模板类型，和配置的templateTypes字段同时出现 \
group:可选字段，节点模板所属的模板组 \
childrenTypes:可选字段，限制子节点的模板类型，覆盖模板类型的childrenTypes字段 \
childrenIds:可选字段，限制子节点的模板ID，补充childrenTypes字段，按类型限制有时会比较宽泛 \
childrenNum:可选字段，限制子节点的数量，覆盖模板类型的childrenNum字段 \
params:可选字段，节点模板参数，详情看下面示例

```js
//节点模板参数示例
//动作节点1参数
templates[6].params = [
    {name: "p1", label: '参数1', type: "int", required: true},
    {name: "p2", label: '参数2', type: "string", pattern: '^[abc]*$', required: true},
    {name: "p3", label: '参数3', type: "boolean", default: true},
    {name: "p4", label: '参数4', type: "float", default: 2, min: 0, max: 100},
];

//动作节点2参数
templates[7].params = [
    {
        name: "p1",
        label: '参数1',
        type: "int",
        default: 1,
        options: [{label: '选项1-1', value: 1}, {label: '选项1-2', value: 2}]
    },
    {
        name: "p2",
        label: '参数2',
        type: "string",
        default: 'aaa',
        options: [{label: '选项2-1', value: 'aaa'}, {label: '选项2-2', value: 'bbb'}]
    },//单选
    {
        name: "p3",
        label: '参数3',
        type: "string",
        default: ['aaa'],
        options: [{label: '选项3-1', value: 'aaa'}, {label: '选项3-2', value: 'bbb'}]
    },//多选
];

//切换状态节点
templates[12].params = [
    {name: "p1", label: '状态', type: "int", options: {refType: "node", refId: 2}}
];
```

name:参数名，不能重复 \
label:参数标签，用于显示 \
type:参数类型,合法值为boolean、int、float、string \
default:可选字段，参数默认值，类型可以是参数类型、参数类型的数组、空数组 \
required:可选字段，参数是否必需 \
pattern:可选字段，正则表达式格式，参数类型为string可能需要 \
min、max:可选字段，最小值、最大值，参数类型为int、float时可能需要 \
options:可选字段，参数选项列表，数组或者对象类型：\
options为数组类型时，其中每个选项对象包含label、value两个字段，value字段的类型要和参数类型保持一致，参数default字段为数组时则选项列表为多选，否则选项列表为单选 \
options为对象类型时，refType: "node"表示选项列表引用行为树节点，refId即节点模板ID

### archetypes

创建行为树时的原型，至少有一个，最简单的就是只带一个根节点，示例如下：

```js
 archetypes = [
    {
        name: "新建行为树",
        tree: {//行为树根节点
            id: 1,//节点ID
            comment: "",//节点备注
            tid: 1,//节点模板ID
            children: [
                {id: 2, comment: "", tid: 2}
            ],
            childrenFolded: false//子节点是否收起
        }
    }
];
```

## 调试

设置目标服务器的调试基地址(baseUrl)，通过HTTP请求调试数据，最后选择调试目标进行调试 \
目标服务器需要实现以下三个接口

### ${baseUrl}/list1

无参请求 \
返回目标1(例如场景)列表，其中第1行是表头

```js
[
    {"id": "场景ID", "name": "场景名称"},
    {"id": 1, "name": "场景1"},
    {"id": 2, "name": "场景2"}
]
```

### ${baseUrl}/list2?id1=1

参数id1是接口list1返回的目标1的id \
返回目标2(例如怪物)列表，其中第1行是表头，tree表示目标2使用的行为树的名字
```js
[
    {"id": "怪物ID",  "name": "怪物名称", "tree": "行为树"},
    {"id": 1,  "name": "怪物1", "tree": "行为树1"},
    {"id": 2,  "name": "怪物2", "tree": "行为树2"}
]
```

### ${baseUrl}/records?id1=1&id2=1

参数id1是接口list1返回的目标1的id，参数id2是接口list2返回的目标2的id \
返回目标运行记录帧列表 \
帧：代表行为树的一次完整运行记录，包含若干步 \
步：代表一个节点的运行记录，nodeId:当前步的行为树节点ID，context:任意类型的实时上下文数据

```js
[
    [
        {"nodeId": 1, "context": {"hp":100,"mp":90}},//这是一步
        {"nodeId": 2, "context": {"hp":80}},
        {"nodeId": 3, "context": {"hp":50}}
    ],//这是一帧
    [
        {"nodeId": 1, "context": 1},
        {"nodeId": 2, "context": 2},
        {"nodeId": 1, "context": 3}
    ]
]
```