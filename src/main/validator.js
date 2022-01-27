import Ajv from "ajv/dist/2020";
import addFormats from "ajv-formats"
import localize from "ajv-i18n";

//节点格式
let node = {
    $id: "node",
    type: "object",
    properties: {
        id: {
            type: "integer",
            minimum: 1
        },
        tid: {
            type: "integer",
            minimum: 1,
        },
        comment: {
            type: "string"
        },
        params: {
            type: "object",
            additionalProperties: {
                oneOf: [
                    {type: "string"},
                    {type: "boolean"},
                    {type: "number"},
                    {
                        type: "array",
                        items: {
                            oneOf: [
                                {type: "string"},
                                {type: "boolean"},
                                {type: "number"},
                            ],
                        },
                        uniqueItems: true
                    },
                ],
            }
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
    required: ["id", "tid"],
    additionalProperties: false
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
                type: "string",
                minLength: 1,
                maxLength: 10
            },
            childrenTypes: {
                type: "array",
                items: {
                    type: "integer"
                },
                uniqueItems: true
            },
            childrenNum: {
                type: "integer",
                minimum: -1
            },
            comment: {
                type: "boolean"
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
                type: "string",
                minLength: 1,
                maxLength: 10
            }
        },
        required: ["id", "name"],
        additionalProperties: false
    },
    uniqueItems: true
};

//模板参数格式
let templateParams = {
    type: "array",
    items: {
        type: "object",
        properties: {
            name: {
                type: "string"
            },
            label: {
                type: "string"
            },
            type: {
                type: "string",
                enum: ["boolean", "int", "float", "string"]
            },
            default: {
                oneOf: [
                    {type: "boolean"},
                    {type: "number"},
                    {type: "string"},
                    {
                        type: "array",
                        items: {
                            oneOf: [
                                {type: "boolean"},
                                {type: "number"},
                                {type: "string"},
                            ]
                        },
                        uniqueItems: true
                    },
                ]
            },
            required: {type: "boolean"},
            pattern: {
                type: "string",
                format: "regex"
            },
            min: {type: "number"},
            max: {
                type: "number",
                minimum: {$data: "1/min"}
            },
            options: {
                oneOf: [
                    {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                label: {
                                    type: "string",
                                    minLength: 1
                                },
                                value: {
                                    oneOf: [
                                        {type: "string"},
                                        {type: "boolean"},
                                        {type: "number"},
                                    ],
                                }
                            },
                            required: ["label", "value"],
                            additionalProperties: false
                        },
                        minItems: 1,
                        uniqueItems: true
                    },
                    {
                        type: "object",
                        properties: {
                            refType: {
                                type: "string",
                                enum: ["node"]
                            },
                            refId: {
                                oneOf: [
                                    {type: "string"},
                                    {type: "integer"}
                                ],
                            }
                        },
                        additionalProperties: false
                    }
                ]
            }
        },
        required: ["label", "type"],
        additionalProperties: false,
        dependentSchemas: {
            pattern: {
                properties: {
                    type: {const: "string"}
                }
            },
            min: {
                properties: {
                    type: {enum: ["int", "float"]}
                }
            },
            max: {
                properties: {
                    type: {enum: ["int", "float"]}
                }
            }
        },
        allOf: [
            {
                if: {
                    properties: {
                        type: {const: "string"}
                    }
                },
                then: {
                    properties: {
                        default: {
                            oneOf: [
                                {type: "string"},
                                {
                                    type: "array",
                                    items: {
                                        type: "string"
                                    }
                                },
                            ]
                        }
                    }
                }
            },
            {
                if: {
                    properties: {
                        type: {const: "string"},
                        options: {type: "array"}
                    }
                },
                then: {
                    properties: {
                        options: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    value: {type: "string"}
                                }
                            }
                        }
                    }
                }
            },
            {
                if: {
                    properties: {
                        type: {const: "int"}
                    }
                },
                then: {
                    properties: {
                        default: {
                            oneOf: [
                                {type: "integer"},
                                {
                                    type: "array",
                                    items: {
                                        type: "integer"
                                    }
                                },
                            ]
                        }
                    }
                }
            },
            {
                if: {
                    properties: {
                        type: {const: "int"},
                        options: {type: "array"}
                    }
                },
                then: {
                    properties: {
                        options: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    value: {type: "integer"}
                                }
                            }
                        }
                    }
                }
            },
            {
                if: {
                    properties: {
                        type: {const: "float"}
                    }
                },
                then: {
                    properties: {
                        default: {
                            oneOf: [
                                {type: "number"},
                                {
                                    type: "array",
                                    items: {
                                        type: "number"
                                    }
                                },
                            ]
                        }
                    }
                }
            },
            {
                if: {
                    properties: {
                        type: {const: "float"},
                        options: {type: "array"}
                    }
                },
                then: {
                    properties: {
                        options: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    value: {type: "number"}
                                }
                            }
                        }
                    }
                }
            },
            {
                if: {
                    properties: {
                        type: {type: "boolean"}
                    }
                },
                then: {
                    properties: {
                        default: {
                            oneOf: [
                                {type: "boolean"},
                                {
                                    type: "array",
                                    items: {
                                        type: "boolean"
                                    }
                                },
                            ]
                        }
                    }
                }
            },
            {
                if: {
                    properties: {
                        type: {const: "boolean"},
                        options: {type: "array"}
                    }
                },
                then: {
                    properties: {
                        options: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    value: {type: "boolean"}
                                }
                            }
                        }
                    }
                }
            },
            {
                if: {
                    not: {
                        required: ["options"]
                    }
                },
                then: {
                    properties: {
                        default: {
                            oneOf: [
                                {type: "boolean"},
                                {type: "number"},
                                {type: "string"},
                            ]
                        }
                    }
                }
            }
        ]
    }
};

//模板格式
let templates = {
    type: "array",
    items: {
        type: "object",
        properties: {
            id: {
                type: ["integer", "string"],
                minimum: 1,
                minLength: 1,
                maxLength: 10
            },
            name: {
                type: "string",
                minLength: 1
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
                type: "string",
                maxLength: 300
            },
            params: templateParams,
            childrenTypes: {
                type: "array",
                items: {
                    type: "integer"
                },
                uniqueItems: true
            },
            childrenIds: {
                type: "array",
                items: {
                    type: "integer"
                },
                uniqueItems: true
            },
            childrenNum: {
                type: "integer",
                minimum: -1
            },
            comment: {
                type: "boolean"
            }
        },
        required: ["id", "name"],
        additionalProperties: false
    },
    minItems: 1,
    uniqueItems: true
};

//创建行为树时的原型格式
let archetype = {
    $id: "archetype",
    type: "object",
    properties: {
        name: {
            type: "string",
            minLength: 1,
            maxLength: 20
        },
        tree: {
            $ref: "node"
        }
    },
    required: ["name", "tree"],
    additionalProperties: false
};

//编辑器配置格式
let config = {
    $id: "config",
    type: "object",
    properties: {
        templateTypes,
        templateGroups,
        templates,
        archetypes: {
            type: "array",
            items: {$ref: "archetype"},
            minItems: 1,
            uniqueItems: true
        },
    },
    required: ["templates", "archetypes"],
    additionalProperties: false
};

let behavior = {
    $id: "behavior",
    type: "object",
    properties: {
        workspaces: {
            type: "array",
            items: {
                type: "string"
            },
            uniqueItems: true
        }
    },
    required: ["workspaces"],
    additionalProperties: false
};

function validateConfigLogic(config) {
    let errors = [];

    let mappedTemplateTypes = new Map();
    if (config.templateTypes) {
        for (const templateType of config.templateTypes) {
            if (mappedTemplateTypes.has(templateType.id)) {
                errors.push(`节点模板类型ID(${templateType.id})有重复`);
            }
            mappedTemplateTypes.set(templateType.id, templateType);
        }
    }

    let mappedTemplateGroups = new Map();
    if (config.templateGroups) {
        for (const templateGroup of config.templateGroups) {
            if (mappedTemplateGroups.has(templateGroup.id)) {
                errors.push(`节点模板组ID(${templateGroup.id})有重复`);
            }
            mappedTemplateGroups.set(templateGroup.id, templateGroup);
        }
    }

    let mappedTemplates = new Map();
    for (const template of config.templates) {
        if (mappedTemplates.has(template.id)) {
            errors.push(`节点模板ID(${template.id})有重复`);
        }
        if (mappedTemplateTypes.size > 0 && !template.type) {
            errors.push(`节点模板(${template.id})的模板类型未设置`);
        }
        if (template.type && !mappedTemplateTypes.has(template.type)) {
            errors.push(`节点模板(${template.id})的模板类型(${template.type})不存在`);
        }
        if (template.group && !mappedTemplateGroups.has(template.group)) {
            errors.push(`节点模板(${template.id})的模板组(${template.group})不存在`);
        }
        if (template.childrenTypes) {
            for (const childrenType of template.childrenTypes) {
                if (!mappedTemplateTypes.has(childrenType)) {
                    errors.push(`节点模板(${template.id})限制的子节点模板类型(${childrenType})不存在`);
                }
            }
        }

        mappedTemplates.set(template.id, template);
    }

    for (const template of config.templates) {
        if (template.params) {
            let paramNames = new Set();
            for (let param of template.params) {
                if (paramNames.has(param.name)) {
                    errors.push(`节点模板(${template.id})的参数名(${param.name})重复`);
                }
                paramNames.add(param.name);
                let options = param.options;
                if (typeof options === "object" && options.refType === "node" && !mappedTemplates.has(options.refId)) {
                    errors.push(`节点模板(${template.id})的参数(${param.name})选项引用的模板(${options.refId})不存在`);
                }
            }
        }
        if (template.childrenIds) {
            for (const childrenId of template.childrenIds) {
                if (!mappedTemplates.has(childrenId)) {
                    errors.push(`节点模板(${template.id})限制的子节点模板ID(${childrenId})不存在`);
                }
            }
        }
    }

    let mappedArchetypes = new Map();
    for (const archetype of config.archetypes) {
        if (mappedArchetypes.has(archetype.name)) {
            errors.push(`行为树原型名称(${archetype.name})有重复`);
        }
        mappedArchetypes.set(archetype.name, archetype);
        let nodeIds = new Set();
        let validateNode = node => {
            if (nodeIds.has(node.id)) {
                errors.push(`行为树原型(${archetype.name})的节点ID(${node.id})有重复`);
            }
            if (!mappedTemplates.has(node.tid)) {
                errors.push(`行为树原型(${archetype.name})节点(${node.id})的模板(${node.tid})不存在`);
            }
            nodeIds.add(node.id);
            if (node.children) {
                for (let child of node.children) {
                    validateNode(child);
                }
            }
        };
        validateNode(archetype.tree);
    }

    return errors;
}

let logicValidators = {config: validateConfigLogic};

let ajv = addFormats(new Ajv({$data: true}));
ajv.addSchema([node, archetype, config, behavior]);

function localizeProxy(validate) {
    return new Proxy(validate, {
        apply(target, thisArg, argArray) {
            if (target.apply(thisArg, argArray)) {
                let validateLogic = logicValidators[validate.schema.$id];
                if (validateLogic) {
                    let errors = validateLogic(...argArray);
                    if (errors.length > 0) {
                        validate.errors = errors;
                        return false;
                    }
                }
                return true;
            } else {
                localize.zh(validate.errors);
                return false;
            }
        }
    });
}

export let validateNode = localizeProxy(ajv.getSchema("node"));
export let validateConfig = localizeProxy(ajv.getSchema("config"));
export let validateBehavior = localizeProxy(ajv.getSchema("behavior"));