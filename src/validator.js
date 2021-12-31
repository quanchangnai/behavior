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
                            items: {
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
                            items: {
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
                            items: {
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
            }
        }
    },
    required: ["workspaces"],
    additionalProperties: false
};

let ajv = new Ajv({$data: true});
addFormats(ajv);

ajv.addSchema(node);
ajv.addSchema(tree);
ajv.addSchema(config);
ajv.addSchema(behavior);

function localizeProxy(validate) {
    return new Proxy(validate, {
        apply(target, thisArg, argArray) {
            if (target.apply(thisArg, argArray)) {
                return true;
            } else {
                localize.zh(validate.errors);
                return false;
            }
        }
    });
}

let validateNode = localizeProxy(ajv.getSchema("node"));
let validateTree = localizeProxy(ajv.getSchema("tree"));
let validateConfig = localizeProxy(ajv.getSchema("config"));
let validateBehavior = localizeProxy(ajv.getSchema("behavior"));

export {validateNode, validateTree, validateConfig, validateBehavior}

