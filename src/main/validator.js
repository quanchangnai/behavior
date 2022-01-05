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
        name: {
            type: "string",
            maxLength: 10
        },
        tid: {
            type: "integer",
            minimum: 1,
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
            type: "string",
            minLength: 1,
            maxLength: 10
        },
        root: {
            $ref: "node"
        }
    },
    required: ["id", "name", "root"],
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
                    type: "integer",
                    minimum: 1
                },
                uniqueItems: true
            },
            childrenNum: {
                type: "integer",
                minimum: -1
            },
            nodeHasName: {
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
    type: "object",
    additionalProperties: {
        type: "object",
        properties: {
            label: {
                type: "string"
            },
            value: {
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
            },
            pattern: {
                type: "string",
                format: "regex"
            },
            precision: {
                type: "integer",
                minimum: 0,
                maximum: 6
            },
            min: {type: "number"},
            max: {
                type: "number",
                minimum: {$data: "1/min"}
            },
            options: {
                type: "array",
                items: {
                    type: "object",
                    properties: {
                        label: {
                            type: "string",
                            maxLength: 5
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
        },
        required: ["label", "value"],
        additionalProperties: false,
        dependentSchemas: {
            pattern: {
                properties: {
                    value: {type: "string"}
                }
            },
            precision: {
                properties: {
                    value: {type: "number"}
                }
            },
            min: {
                properties: {
                    value: {type: "number"}
                }
            },
            max: {
                properties: {
                    value: {type: "number"}
                }
            }
        },
        allOf: [
            {
                if: {
                    properties: {
                        value: {type: "array"}
                    }
                },
                then: {
                    required: ["options"],
                }
            },
            {
                if: {
                    properties: {
                        value: {type: "string"}
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
                        value: {type: "number"}
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
                        value: {type: "boolean"}
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
                type: "integer",
                minimum: 1
            },
            name: {
                type: "string",
                minLength: 1,
                maxLength: 10
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
                minLength: 5,
                maxLength: 300
            },
            params: templateParams,
            childrenNum: {
                type: "integer",
                minimum: -1
            },
            nodeHasName: {
                type: "boolean"
            }
        },
        required: ["id", "name", "type"],
        additionalProperties: false
    },
    minItems: 1,
    uniqueItems: true
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
            items: {$ref: "tree"},
            minItems: 1,
            uniqueItems: true
        },
    },
    required: ["templateTypes", "templates", "archetypes"],
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
    for (const templateType of config.templateTypes) {
        if (mappedTemplateTypes.has(templateType.id)) {
            errors.push(`节点模板类型ID(${templateType.id})有重复`);
        }
        mappedTemplateTypes.set(templateType.id, templateType);
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
        if (!mappedTemplateTypes.has(template.type)) {
            errors.push(`节点模板(${template.id})的模板类型(${template.type})不存在`);
        }
        if (template.group && !mappedTemplateGroups.has(template.group)) {
            errors.push(`节点模板(${template.id})的模板组(${template.group})不存在`);
        }
        mappedTemplates.set(template.id, template);
    }

    let mappedArchetypes = new Map();
    for (const archetype of config.archetypes) {
        if (mappedArchetypes.has(archetype.id)) {
            errors.push(`行为树原型ID(${archetype.id})有重复`);
        }
        mappedArchetypes.set(archetype.id, archetype);
        let nodeIds = new Set();
        let validateNode = node => {
            if (nodeIds.has(node.id)) {
                errors.push(`行为树原型(${archetype.id})的节点ID(${node.id})有重复`);
            }
            if (!mappedTemplates.has(node.tid)) {
                errors.push(`行为树原型(${archetype.id})节点(${node.id})的模板(${node.tid})不存在`);
            }
            nodeIds.add(node.id);
            if (node.children) {
                for (let child of node.children) {
                    validateNode(child);
                }
            }
        };
        validateNode(archetype.root);
    }

    return errors;
}

let logicValidators = {config: validateConfigLogic};

let ajv = addFormats(new Ajv({$data: true}));
ajv.addSchema([node, tree, config, behavior]);

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
export let validateTree = localizeProxy(ajv.getSchema("tree"));
export let validateConfig = localizeProxy(ajv.getSchema("config"));
export let validateBehavior = localizeProxy(ajv.getSchema("behavior"));