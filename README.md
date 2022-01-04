# behavior

behavior是一款可配置的可视化行为树编辑器。

## 工程设置

### 安装依赖

```
npm install
```

### 运行

```
npm run run
```

### 打包

```
npm run build
```

## 行为树编辑器使用

### 启动

点击程序目录下得behavior.exe启动，或者通过命令行"behavior.exe aaa"启动，<br>
参数aaa是要打开的工作区，后续编辑的行为树都会以json文件的形式保存在这里，<br>
也还可以在程序目录下创建文件behavior.json配置，

```json
{
    "workspaces": [
        "bbb"
    ]
}
```

在程序启动后也还可以通过菜单手动打开工作区。

## 配置

配置主要用来告诉编辑器如何编辑行为树，<br>
第一次打开工作区时会在工作区目录下自动创建配置文件_config.json，可以修改成自己的配置。<br>
配置文件包含四个要素：

### templateTypes

节点模板类型，主要用于控制节点连接性和子节点数量。

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

childrenTypes:限制子节点的类型,类型不合法的节点不允许作为子节点挂载<br>
childrenNum:限制子节点的数量，-1:不限制,0:不允许挂子节点...<br>

### templateGroups

节点模板组，用于搜索筛选逻辑，不需要筛选可以不配置。

```js
//节点模板组示例
templateGroups = [
    {id: 1, name: "基础节点"},
    {id: 2, name: "逻辑节点1"},
    {id: 3, name: "逻辑节点2"},
];
```

### templates

节点模板，行为树的每一个节点都是以此创建的。

```js
//节点模板示例
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
    {id: 12, name: "条件执行节点", type: 3, group: 3, desc: "条件执行节点描述", childrenNum: 3}
];
```

childrenNum:可以选择覆盖模板类型的childrenNum。 params:节点模板参数字段可选，详情看下面示例。

```js
//节点模板参数示例
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
    p2: {label: '参数2', value: 'aaa', options: [{label: '选项2-1', value: 'aaa'}, {label: '选项2-2', value: 'bbb'}]},
    p3: {label: '参数3', value: ['aaa'], options: [{label: '选项3-1', value: 'aaa'}, {label: '选项3-2', value: 'bbb'}]},
};
```

p1-p4:参数名<br>
label:参数标签，用于显示。<br>
value:默认参数值,合法类型boolean、number、string以及三者的数组(此时options必选)。<br>
options:可选字段，参数选项列表,默认参数值为数组时则选项列表为多选，默认参数值为单值时则选项列表为单选。<br>

### archetypes

创建行为树时的原型，至少有一个原型，最简单的就是只带一个根节点，示例如下：

```js
 archetypes = [
    {
        id: 1,
        name: "新建行为树",
        root: {//行为树根节点
            id: 1,
            name: "",
            tid: 1,//节点模板ID
            children: [
                {id: 2, name: "", tid: 2}
            ],
            childrenFolded: false//子节点是否收起
        }
    }
];
```
