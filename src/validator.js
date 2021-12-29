import Ajv from "ajv";

//节点格式
let node = {
    $id: "node",
    type: "object",
    properties: {
        id: {
            type: "integer",
            minimum: 1
        },
        name: {
            type: "string"
        },
        tid: {
            type: "integer",
            minimum: 1
        },
        params: {
            type: "object"
        },
        children: {
            type: "array",
            items: {
                $ref: '#'
            },
            uniqueItems: true
        },
        childrenFolded: {
            type: "boolean",
        }
    },
    required: ["id", "name", "tid"],
    additionalProperties: false
};

//行为树格式
let tree = {
    $id: "tree",
    type: "object",
    properties: {
        id: {
            type: "integer",
            minimum: 1
        },
        name: {
            type: "string"
        },
        root: {
            $ref: "node"
        }
    },
    required: ["id", "name", "root"],
    additionalProperties: false,
};

//模板类型格式
let templateTypes = {
    type: "array",
    items: {
        type: "object",
        properties: {
            id: {
                type: "integer",
                minimum: 1
            },
            name: {
                type: "string"
            },
            childrenTypes: {
                type: "array",
                items: {
                    type: "integer",
                    minimum: 1
                },
                uniqueItems: true
            },
            childrenNum: {
                type: "integer",
                minimum: -1
            }
        },
        required: ["id", "name", "childrenTypes", "childrenNum"],
        additionalProperties: false
    },
    minItems: 1,
    uniqueItems: true
};

//模板组格式
let templateGroups = {
    type: "array",
    items: {
        type: "object",
        properties: {
            id: {
                type: "integer",
                minimum: 1
            },
            name: {
                type: "string"
            }
        },
        required: ["id", "name"],
        additionalProperties: false
    },
    uniqueItems: true
};

//模板格式
let templates = {
    type: "array",
    items: {
        type: "object",
        properties: {
            id: {
                type: "integer",
                minimum: 1
            },
            name: {
                type: "string"
            },
            type: {
                type: "integer",
                minimum: 1
            },
            group: {
                type: "integer",
                minimum: 1
            },
            desc: {
                type: "string"
            },
            params: {
                type: "object"
            },
            childrenNum: {
                type: "integer",
                minimum: -1
            }
        },
        required: ["id", "name", "type"],
        additionalProperties: false
    },
    minItems: 1,
    uniqueItems: true
};

//行为树配置格式
let config = {
    $id: "config",
    type: "object",
    properties: {
        templateTypes,
        templateGroups,
        templates,
        defaultTree: {
            $ref: "tree"
        },
    },
    required: ["templateTypes", "templates", "defaultTree"],
    additionalProperties: false,
};

let ajv = new Ajv();
ajv.addSchema(node);
ajv.addSchema(tree);
ajv.addSchema(config);

let validateNode = ajv.getSchema("node");
let validateConfig = ajv.getSchema("config");
let validateTree = ajv.getSchema("tree");


export {validateConfig, validateTree, validateNode}

