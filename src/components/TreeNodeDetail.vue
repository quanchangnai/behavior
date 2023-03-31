<template>
    <div class="tree-node-detail">
        <div class="tree-node-header">
            <span>{{ node.template.name }}</span>
            <span v-if="node.tree&&node.tree.showNodeId">({{ node.id }})</span>
            <span id="close-icon" class="el-icon-close" @click="close"/>
        </div>
        <el-form ref="form"
                 :model="node"
                 size="mini"
                 :inline="true"
                 :label-position="paramLabelPosition"
                 :hide-required-asterisk="true"
                 :disabled="node.tree.debugging">
            <el-form-item v-if="node.template.comment"
                          prop="comment"
                          :label-width="paramLabelWidth+'px'"
                          :style="{'margin-right':paramMarginRight+'px'}">
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
                              :style="paramValueStyle('comment',0)"
                              @dblclick.stop.native
                              @copy.stop.native
                              @paste.stop.native
                              @blur="checkParams"/>
                </el-tooltip>
            </el-form-item>
            <el-form-item v-for="(param,index) in node.template.params"
                          :key="param.name"
                          :label-width="paramLabelWidth+'px'"
                          :style="{'margin-right':paramMarginRight+'px'}"
                          :show-message="false"
                          :prop="'params.'+param.name">
                <template #label>
                    <el-tooltip effect="light"
                                :disabled="!param.pattern"
                                :arrowOffset="15"
                                :hide-after="1000"
                                popper-class="tooltip"
                                placement="bottom-start">
                        <template #content>
                            <span>{{ param.pattern }}</span>
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
                    <el-select v-if="param.options"
                               :ref="'paramValue-'+param.name"
                               v-model="node.params[param.name]"
                               :style="paramValueStyle(param.name,index+1)"
                               :multiple="Array.isArray(param.default)"
                               :collapse-tags="true"
                               @dblclick.stop.native
                               @copy.stop.native
                               @paste.stop.native
                               @blur="checkParams"
                               popper-class="node-param-select-dropdown">
                        <el-option v-for="(option,i) in paramOptions(param.options)"
                                   :key="param.name+'-option-'+i"
                                   :label="option.label"
                                   :value="option.value"/>
                    </el-select>
                    <el-input-number v-else-if="param.type==='int' || param.type==='float'"
                                     :ref="'paramValue-'+param.name"
                                     v-model="node.params[param.name]"
                                     :style="paramValueStyle(param.name,index+1)"
                                     @dblclick.stop.native
                                     @copy.stop.native
                                     @paste.stop.native
                                     @blur="checkParams"
                                     :precision="param.type==='float'?2:0"
                                     :min="typeof param.min==='number'?param.min:-Infinity"
                                     :max="typeof param.max==='number'?param.max:Infinity"/>
                    <el-input v-else-if="param.type==='string'"
                              :ref="'paramValue-'+param.name"
                              v-model="node.params[param.name]"
                              :style="paramValueStyle(param.name,index+1)"
                              @dblclick.stop.native
                              @copy.stop.native
                              @paste.stop.native
                              @blur="checkParams"/>
                </el-tooltip>
            </el-form-item>
        </el-form>
    </div>
</template>

<script>
import clipboard from "@/render/clipboard";

export default {
    name: "TreeNodeDetail",
    props: {
        node: Object
    },
    data() {
        return {
            paramLabelPosition: "right",
            paramLabelWidth: 60,
            paramValueWidths: [],
            paramMarginRight: 20,
            paramValueTips: {},//参数值提示状态
            commentTips: false
        };
    },
    mounted() {
        this.resizeObserver = new ResizeObserver(this.calcParamWidth);
        this.resizeObserver.observe(this.$refs.form.$el);
    },
    destroyed() {
        this.resizeObserver.disconnect();
    },
    watch: {
        node() {
            this.calcParamWidth();
        },
    },
    methods: {
        calcParamWidth() {
            let paramCount = 0;

            if (this.node.template.comment) {
                this.paramLabelWidth = this.$utils.calcTextWidth("节点备注") + 10;
                paramCount++;
            }

            if (this.node.template.params) {
                for (let param of this.node.template.params) {
                    paramCount++;
                    let labelWidth = this.$utils.calcTextWidth(param.label || param.name) + 10;
                    this.paramLabelWidth = Math.min(Math.max(this.paramLabelWidth, labelWidth), 100);
                }
            }

            if (paramCount < 1) {
                return;
            }

            // noinspection JSUnresolvedVariable
            let formWidth = this.$refs.form.$el.offsetWidth - 1;

            let perLinesNumber;
            if (paramCount <= 2) {
                perLinesNumber = 2;
            } else if (paramCount % 4 === 0 || paramCount % 3 !== 0 && paramCount % 4 >= paramCount % 3) {
                perLinesNumber = 4;
            } else {
                perLinesNumber = 3;
            }

            let paramValueWidthMin = 140;
            let paramValueWidth = formWidth / perLinesNumber - this.paramLabelWidth;
            if (paramValueWidth < paramValueWidthMin + 20) {
                perLinesNumber = 2;
                paramValueWidth = Math.max(paramValueWidthMin, formWidth / perLinesNumber - this.paramLabelWidth)
            }

            let marginRightPercent = Math.max(0.1, Math.min(0.4, paramValueWidth / 1000))
            this.paramMarginRight = paramValueWidth * marginRightPercent;
            paramValueWidth = paramValueWidth * (1 - marginRightPercent);

            let paramWidth = this.paramLabelWidth + paramValueWidth + this.paramMarginRight;
            let lineCount = Math.ceil(paramCount / perLinesNumber);

            if (paramWidth * perLinesNumber > formWidth + 5) {
                paramValueWidth += Math.max(formWidth - paramWidth * (perLinesNumber - 1), 0);
                paramWidth = this.paramLabelWidth + paramValueWidth + this.paramMarginRight;
            }

            if (paramWidth > formWidth) {
                paramValueWidth = Math.max(paramValueWidthMin, formWidth * 0.9);
                this.paramLabelPosition = "left"
            } else {
                this.paramLabelPosition = "right"
            }

            this.paramValueWidths = [];
            for (let i = 0; i < paramCount; i++) {
                this.paramValueWidths[i] = paramValueWidth;
            }

            if (lineCount > 1 && paramWidth * perLinesNumber < formWidth + 5 && perLinesNumber * lineCount === paramCount + 1) {
                this.paramValueWidths[paramCount - 1] = paramValueWidth + paramWidth;
            }
        },
        close() {
            clipboard.selectNode(this.node, false);
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
        paramLabelStyle(paramName) {
            let style = {};
            if (this.node.errorParams?.has(paramName)) {
                style.color = "#EF3B35FF";
            }
            return style
        },
        paramValueStyle(paramName, index) {
            return {width: this.paramValueWidths[index] + 'px'};
        },
        checkParams() {
            this.$utils.checkNodeParams(this.node);
            this.checkParamValueTips();
            this.$utils.saveTree(this.node.tree);
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


.tree-node-header {
    margin: 10px;
    white-space: nowrap;
}

.tree-node-header > span {
    position: relative;
    z-index: 1;
    background-color: white;
}

#close-icon {
    position: absolute;
    right: 10px;
    margin-top: 3px;
    z-index: 0;
    cursor: pointer;
}

.el-form {
    margin: 10px 50px 10px 10px;
    padding-top: 3px;
}

.el-form-item {
    margin: 6px 0;
}

.paramLabel {
    display: inline-block;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;

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