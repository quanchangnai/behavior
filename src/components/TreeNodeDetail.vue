<template>
    <div class="tree-node-detail">
        <div class="tree-node-header">
            <span>{{ node.template.name }}</span>
            <span v-if="node.tree&&node.tree.showNodeId">({{ node.id }})</span>
        </div>
        <el-form ref="form"
                 :inline="true"
                 :model="node"
                 :disabled="node.tree.debugging"
                 size="mini"
                 label-width="auto"
                 label-position="right"
                 :hide-required-asterisk="true"
                 @validate="onFormValidate">
            <el-form-item v-if="node.template.comment"
                          prop="comment"
                          :rules="{trigger: 'blur'}">
                <template #label>
                    <span class="paramLabel">节点备注</span>
                </template>
                <el-tooltip effect="light"
                            :disabled="!commentTips"
                            :arrowOffset="15"
                            :content="node.comment"
                            popper-class="tooltip"
                            placement="right">
                    <el-input ref="comment"
                              v-model="node.comment"
                              @dblclick.stop.native
                              @copy.stop.native
                              @paste.stop.native/>
                </el-tooltip>
            </el-form-item>
            <el-form-item v-for="param in node.template.params"
                          :key="param.name"
                          :rules="paramRules(param)"
                          :show-message="false"
                          :prop="'params.'+param.name">
                <template #label>
                    <el-tooltip effect="light"
                                :disabled="!paramLabelTips[param.name]"
                                :arrowOffset="15"
                                :hide-after="1000"
                                popper-class="tooltip"
                                placement="bottom-start">
                        <template #content>
                            <span v-if="(paramLabelTips[param.name]&1)===1">{{ param.label }}<br></span>
                            <span v-if="(paramLabelTips[param.name]&2)===2">
                                    格式：{{ param.pattern }}
                            </span>
                        </template>
                        <span class="paramLabel"
                              :ref="'paramLabel-'+param.name"
                              :style="paramLabelStyle(param.name)">
                                        {{ param.label || param.name }}
                        </span>
                    </el-tooltip>
                </template>
                <el-tooltip effect="light"
                            :disabled="!paramValueTips[param.name]"
                            popper-class="tooltip"
                            placement="right">
                    <template #content>{{ node.params[param.name] }}</template>
                    <!--suppress JSUnresolvedVariable -->
                    <el-select v-if="param.options"
                               :ref="'paramValue-'+param.name"
                               v-model="node.params[param.name]"
                               :multiple="Array.isArray(param.default)"
                               :collapse-tags="true"
                               @dblclick.stop.native
                               @copy.stop.native
                               @paste.stop.native
                               popper-class="node-param-select-dropdown">
                        <el-option v-for="(option,i) in paramOptions(param.options)"
                                   :key="param.name+'-option-'+i"
                                   :label="option.label"
                                   :value="option.value"/>
                    </el-select>
                    <!--suppress JSUnresolvedVariable -->
                    <el-input-number v-else-if="param.type==='int' || param.type==='float'"
                                     :ref="'paramValue-'+param.name"
                                     v-model="node.params[param.name]"
                                     @dblclick.stop.native
                                     @copy.stop.native
                                     @paste.stop.native
                                     :precision="param.type==='float'?2:0"
                                     :min="typeof param.min==='number'?param.min:-Infinity"
                                     :max="typeof param.max==='number'?param.max:Infinity"/>
                    <el-input v-else-if="param.type==='string'"
                              :ref="'paramValue-'+param.name"
                              v-model="node.params[param.name]"
                              @dblclick.stop.native
                              @copy.stop.native
                              @paste.stop.native/>
                </el-tooltip>
            </el-form-item>
        </el-form>
    </div>
</template>

<script>
export default {
    name: "TreeNodeDetail",
    props: {
        node: Object
    },
    data() {
        return {
            paramValidations: {},//参数校验状态
            paramLabelTips: {},//参数标签提示状态，文本太长时加提示
            paramValueTips: {},//参数值示状态
            commentTips: false
        };
    },
    methods: {
        paramLabelStyle(paramName) {
            let style = {};
            if (this.paramValidations['params.' + paramName] === false) {
                style.color = "#fd7f5a";
            }
            return style
        },
        paramRules(param) {
            let rules = {required: param.required, trigger: 'blur'};
            if (param.type === 'string' && param.pattern) {
                rules.pattern = param.pattern;
            }
            return rules;
        },
        paramOptions(options) {
            if (Array.isArray(options)) {
                //预定义的选项列表
                return options;
            }

            //options.refType==="node",选项列表引用其他节点
            let _options = [];
            this.$utils.visitSubtree(this.node.tree.root, node => {
                if (node.tid === options.refId) {
                    _options.push({label: node.comment || node.template.name + "-" + node.id, value: node.id});
                }
            });

            return _options;
        },
        onFormValidate(prop, pass) {
            if (!pass) {
                this.paramValidations[prop] = pass;
            } else {
                delete this.paramValidations[prop];
            }
            this.checkParamsError();
            this.checkParamValueTips();
            this.$utils.saveTree(this.node.tree);
        },
        checkParamsError() {
            let error = Object.keys(this.paramValidations).length > 0;
            let params = this.node.template.params;
            if (params && !this.node.creating) {
                for (let param of params) {
                    let paramValue = this.node.params[param.name];
                    if (param.required && (paramValue === undefined || Array.isArray(paramValue) && paramValue.length === 0)) {
                        error = true;
                        this.paramValidations['params.' + param.name] = false;
                    }
                }
            }

            console.log("checkParamsError:" + error)
        },
        async checkParamValueTips() {
            //等待渲染出来后再检测
            await this.$nextTick();
            if (this.node.folded) {
                return;
            }
            if (this.node.template.comment) {
                let commentInner = this.$refs.comment?.$el.querySelector(".el-input__inner");
                this.commentTips = commentInner && this.$utils.checkOverflow(commentInner);
            }
            if (this.node.template.params) {
                this.paramValueTips = {};
                for (let param of this.node.template.params) {
                    let paramValue = this.$refs["paramValue-" + param.name][0];
                    let paramValueInner = paramValue?.$el.querySelector(".el-input__inner");
                    if (paramValueInner && this.$utils.checkOverflow(paramValueInner)) {
                        this.paramValueTips[param.name] = true;
                    }
                }
            }
        },
    }
}
</script>

<style scoped>

.tree-node-detail {
    position: absolute;
    width: 100%;
    bottom: 0;
    z-index: 100;
    border-top: solid #ebeef5 1px;
    background-color: white;
}

>>> .el-card__body {
    padding: 0;
}


>>> .tree-node-header {
    margin: 10px;
}

.el-form {
    margin: 10px;
    padding-top: 3px;
}

.el-form-item {
    margin: 6px 20px 6px 0;
}

.paramLabel {
    display: inline-block;
    max-width: 72px;
    overflow: hidden;
    text-overflow: ellipsis;

}

.el-input, .el-input-number, .el-select {
    width: 150px;
}


>>> input:disabled,
>>> .el-input.is-disabled .el-input__icon,
>>> .el-input-number.is-disabled span,
>>> .el-radio__input.is-disabled .el-radio__inner,
>>> .el-radio__input.is-disabled .el-radio__inner::after,
>>> .el-radio__input.is-disabled + span.el-radio__label {
    cursor: default !important;
}

</style>

<!--suppress CssUnusedSymbol -->
<style>
[x-placement^="bottom"].node-param-select-dropdown {
    transform: translateY(-8px);
}

[x-placement^="top"].node-param-select-dropdown {
    transform: translateY(10px);
}

[x-placement^="bottom"].node-param-select-dropdown.is-multiple {
    transform: translateY(-7px);
}

[x-placement^="top"].node-param-select-dropdown.is-multiple {
    transform: translateY(7px);
}

.node-param-select-dropdown .el-select-dropdown__item {
    height: 24px;
    line-height: 24px;
}

.node-param-select-dropdown .popper__arrow {
    left: 10px !important;
}

</style>