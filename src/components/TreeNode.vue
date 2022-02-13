<template>
    <draggable :x="node.x"
               :y="node.y"
               :ready="creating"
               :style="{'z-index':node.z}"
               :scale="node.tree&&node.tree.scale||1"
               tabindex="0"
               @drag-start="onDragStart"
               @dragging="onDragging"
               @drag-end="onDragEnd"
               @mousedown.capture.native="onMousedown"
               @dblclick.exact.stop.native="foldSelf"
               @keyup.ctrl.86.exact.native="selected&&$emit('paste')"
               @contextmenu.stop.native="showMenu($event.clientX,$event.clientY)">
        <template>
            <div ref="content"
                 class="content"
                 :class="contentClasses">
                <div class="content-header" ref="contentHeader">
                    <span> {{ node.template.name }}</span>
                    <span v-if="node.tree&&node.tree.showNodeId">
                        ({{ node.id }})
                    </span>
                    <el-tooltip v-if="node.folded && node.comment"
                                effect="light"
                                :disabled="!contentHeaderOverflow"
                                :hide-after="1000"
                                :content="node.comment"
                                popper-class="tooltip"
                                placement="bottom-start">
                        <span>: {{ node.comment }}</span>
                    </el-tooltip>
                </div>
                <div class="content-body"
                     @wheel="onContentBodyWheel"
                     :style="{'height':contentBodyHeight+'px'}"
                     v-if="canFold()&&!node.folded">
                    <el-form size="mini"
                             :model="node"
                             ref="form"
                             label-width="auto"
                             label-position="left"
                             :hide-required-asterisk="true"
                             @validate="onFormValidate"
                             @mousedown.stop.native
                             @dblclick.stop.native>
                        <el-form-item v-if="node.template.comment" prop="comment">
                            <template #label>
                                <span class="paramLabel">
                                    节点备注
                                </span>
                            </template>
                            <el-tooltip effect="light"
                                        :disabled="!commentTips"
                                        :arrowOffset="15"
                                        :content="node.comment"
                                        popper-class="tooltip"
                                        placement="right">
                                <el-input ref="comment"
                                          @copy.stop.native
                                          @paste.stop.native
                                          v-model="node.comment"/>
                            </el-tooltip>
                        </el-form-item>
                        <el-form-item v-for="param in node.template.params"
                                      :key="param.name"
                                      :required="param.required"
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
                                        <span v-if="(paramLabelTips[param.name]&2)===2">格式：{{ param.pattern }}</span>
                                    </template>
                                    <span :ref="'paramLabel-'+param.name"
                                          class="paramLabel"
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
                                <el-radio-group v-if="param.type==='boolean' && !param.options"
                                                :ref="'paramValue-'+param.name"
                                                v-model="node.params[param.name]">
                                    <el-radio :label="true">是</el-radio>
                                    <el-radio :label="false">否</el-radio>
                                </el-radio-group>
                                <!--suppress JSUnresolvedVariable -->
                                <el-select v-else-if="param.options"
                                           :ref="'paramValue-'+param.name"
                                           @copy.stop.native
                                           @paste.stop.native
                                           v-model="node.params[param.name]"
                                           :multiple="Array.isArray(param.default)"
                                           :class="paramSelectClass(param.name)"
                                           @remove-tag="calcContentBodyHeight"
                                           @visible-change="onParamSelectVisibleChange('paramValue-'+param.name,$event)"
                                           popper-class="node-param-select-dropdown">
                                    <el-option v-for="(option,i) in paramOptions(param.options)"
                                               :key="param.name+'-option-'+i"
                                               :label="option.label"
                                               :value="option.value"/>
                                </el-select>
                                <!--suppress JSUnresolvedVariable -->
                                <el-input-number v-else-if="param.type==='int' || param.type==='float'"
                                                 :ref="'paramValue-'+param.name"
                                                 @copy.stop.native
                                                 @paste.stop.native
                                                 v-model="node.params[param.name]"
                                                 :precision="param.type==='float'?2:0"
                                                 :min="typeof param.min==='number'?param.min:-Infinity"
                                                 :max="typeof param.max==='number'?param.max:Infinity"/>
                                <el-input v-else-if="param.type==='string'"
                                          :ref="'paramValue-'+param.name"
                                          @copy.stop.native
                                          @paste.stop.native
                                          v-model="node.params[param.name]"/>
                            </el-tooltip>
                        </el-form-item>
                    </el-form>
                </div>
            </div>
            <div v-if="canFold()"
                 @mousedown.stop
                 @click="foldSelf"
                 class="fold-self-icon"
                 :class="node.folded?'el-icon-arrow-down':'el-icon-arrow-up'"/>
            <div v-if="node.children.length"
                 @mousedown.stop
                 @dblclick.stop
                 @click="foldChildren"
                 class="fold-children-icon"
                 :class="node.childrenFolded?'el-icon-circle-plus-outline':'el-icon-remove-outline'"/>
        </template>
    </draggable>
</template>

<script>
import Draggable from './Draggable'

// noinspection JSUnresolvedVariable
export default {
    name: "TreeNode",
    components: {Draggable},
    props: {
        node: Object,
        creating: {
            type: Boolean,
            default: false
        }
    },
    data() {
        return {
            selected: false,
            contentClasses: {
                selected: false,
                error: false,
                'can-fold': false
            },
            contentBodyHeight: 0,
            contentHeaderOverflow: false,
            paramValidations: {},//参数校验状态
            paramLabelTips: {},//参数标签提示状态，文本太长时加提示
            paramValueTips: {},//参数值示状态
            commentTips: false,
            menuShown: false
        };
    },
    mounted() {
        window.addEventListener('mousedown', event => {
            if (!event.ctrlKey && !this.menuShown) {
                this.selected = false;
            }
        }, true);

        this.resizeObserver = new ResizeObserver(async () => {
            await this.checkContentHeaderOverflow();
            await this.calcContentBodyHeight();
            this.$emit("resize");
        });
        this.resizeObserver.observe(this.$refs.content);

        this.contentClasses.selected = this.selected || this.creating;
        this.contentClasses['can-fold'] = this.canFold();
        this.checkParamsError();
    },
    destroyed() {
        this.resizeObserver.disconnect();
        this.$store.selectedNodes.delete(this.node);
    },
    watch: {
        'node.folded': function (folded) {
            if (!this.canFold()) {
                return;
            }
            if (folded) {
                this.resizeObserver.unobserve(this.$refs.form.$el);
            } else {
                this.$nextTick(() => {
                    this.resizeObserver.observe(this.$refs.form.$el);
                    this.checkParamLabelTips();
                    this.checkParamValueTips();
                });
            }
        },
        selected() {
            this.contentClasses.selected = this.selected || this.creating;

            if (this.selected) {
                this.$store.selectedNodes.add(this.node);
            } else {
                this.$store.selectedNodes.delete(this.node);
            }

            this.$store.selectedType = "allAreLeaves";
            for (let selectedNode of this.$store.selectedNodes) {
                if (selectedNode.children.length) {
                    this.$store.selectedType = "subtree";
                    break;
                }
            }
        }
    },
    methods: {
        onDragStart() {
            this.node.dragging = true;
            this.$emit("drag-start", {node: this.node});
        },
        onDragging(event) {
            const deltaX = event.x - this.node.x;
            const deltaY = event.y - this.node.y;

            this.$utils.visitSubtree(this.node, node => {
                node.x += deltaX;
                node.y += deltaY;
                node.z = this.creating ? 30 : 10;
            });

            this.$emit("dragging", this.node);
        },
        onDragEnd() {
            this.node.dragging = false;
            this.$utils.visitSubtree(this.node, node => node.z = 1);
            this.$emit("drag-end", this.node);
        },
        onPaste() {

        },
        onMousedown(event) {
            if (event.button === 0 && event.ctrlKey) {
                this.selected = !this.selected;
            } else {
                this.selected = true;
            }
        },
        canFold() {
            if (this.creating) {
                return false;
            }
            let template = this.node.template;
            return template.comment || template.params?.length > 0;
        },
        showMenu(x, y) {
            let items = [];
            if (this.canFold()) {
                items.push({label: this.node.folded ? '展开节点' : '收起节点', shortcut: "双击", handler: this.foldSelf});
            }
            if (this.node.children.length) {
                items.push({label: this.node.childrenFolded ? '展开子树' : '收起子树', handler: this.foldChildren});
            }
            items.push({label: '复制子树', shortcut: "Ctrl+C", handler: () => this.$emit("copy", false)});
            items.push({label: '复制节点', shortcut: "Ctrl+Shift+C", handler: () => this.$emit("copy", true)});
            if (this.$store.copyType) {
                let label = this.$store.copyType === "subtree" ? "粘贴子树" : "粘贴节点";
                items.push({label, shortcut: "Ctrl+V", handler: () => this.$emit("paste")});
            }
            if (this.node.parent && this.$store.selectedType) {
                let label = this.$store.selectedType === "subtree" ? "删除子树" : "删除节点";
                items.push({label, shortcut: "Del", handler: () => this.$emit("delete")});
            }
            if (this.node.template.visible) {
                items.push({label: '定位模板', handler: () => this.$events.$emit("position-template", this.node.tid)});
            }

            this.$emit("menu", x, y, items, event => {
                this.menuShown = false;
                if (!event.ctrlKey && !event.clickItem) {
                    this.selected = false;
                }
            });
            this.menuShown = true;
        },
        foldSelf() {
            if (this.canFold()) {
                this.node.folded = !this.node.folded;
                this.$emit("fold");
            }
        },
        foldChildren() {
            this.node.childrenFolded = !this.node.childrenFolded;
            this.$emit("children-fold", this.node);
        },
        onParamSelectVisibleChange(ref, visible) {
            this.node.z = visible ? 200 : 1;
            if (visible) {
                this.$emit("param-select-show", this.$refs[ref][0]);
            }
        },
        paramSelectClass(paramName) {
            let param = this.node.params[paramName];
            // noinspection JSUnresolvedVariable
            let normal = !Array.isArray(param) || Array.isArray(param) && param.length === 0;
            return {"el-select-normal": normal, "el-select-multiple": !normal}
        },
        paramRules(param) {
            if (param.type === 'string' && param.pattern) {
                return {pattern: param.pattern};
            }
            return null;
        },
        paramOptions(options) {
            if (Array.isArray(options)) {
                //预定义的选项列表
                return options;
            }

            //options.refType==="node",选项列表引用节点
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
        },
        checkParamsError() {
            let error = Object.keys(this.paramValidations).length > 0;
            let params = this.node.template.params;
            if (params && !this.creating) {
                for (let param of params) {
                    let paramValue = this.node.params[param.name];
                    if (param.required && (paramValue === undefined || Array.isArray(paramValue) && paramValue.length === 0)) {
                        error = true;
                        this.paramValidations['params.' + param.name] = false;
                    }
                }
            }

            this.contentClasses.error = error;
        },
        paramLabelStyle(paramName) {
            let style = {};
            if (this.paramValidations['params.' + paramName] === false) {
                style.color = "#fd7f5a";
            }
            return style
        },
        async calcContentBodyHeight() {
            await this.$nextTick();

            this.contentBodyOverflow = false;

            let form = this.$refs.form;
            if (!form) {
                return;
            }

            //手动计算高度，多余4个表单项加滚动条，并且防止表单项部分显示
            this.contentBodyHeight = 1;//上边框

            const maxItems = 4;
            let formStyle = getComputedStyle(form.$el);
            this.contentBodyHeight += Number.parseFloat(formStyle.marginTop);
            if (form.$children.length <= maxItems) {
                this.contentBodyHeight += Number.parseFloat(formStyle.marginBottom);
            }

            for (let i = 0; i < form.$children.length && i < maxItems; i++) {
                let formItem = form.$children[i];
                // noinspection JSUnresolvedVariable
                this.contentBodyHeight += formItem.$el.offsetHeight;
            }

            if (form.$children.length > maxItems) {
                this.contentBodyOverflow = true;
            }
        },
        async checkContentHeaderOverflow() {
            if (this.creating || !this.node.comment) {
                return;
            }
            //等待渲染出来后再检测
            await this.$nextTick();
            this.contentHeaderOverflow = this.$utils.checkOverflow(this.$refs.contentHeader);
        },
        async checkParamLabelTips() {
            if (!this.node.template.params) {
                return;
            }
            this.paramLabelTips = {};
            //等待渲染出来后再检测
            await this.$nextTick();
            for (let param of this.node.template.params) {
                this.paramLabelTips[param.name] = 0;
                let paramLabel = this.$refs["paramLabel-" + param.name][0];
                if (this.$utils.checkOverflow(paramLabel)) {
                    this.paramLabelTips[param.name] |= 1;
                }
                if (param.pattern && param.pattern.length > 0) {
                    this.paramLabelTips[param.name] |= 2;
                }
            }
        },
        async checkParamValueTips() {
            //等待渲染出来后再检测
            await this.$nextTick();
            if (this.node.template.comment) {
                let commentInner = this.$refs.comment.$el.querySelector(".el-input__inner");
                this.commentTips = commentInner && this.$utils.checkOverflow(commentInner);
            }
            if (this.node.template.params) {
                this.paramValueTips = {};
                for (let param of this.node.template.params) {
                    let paramValue = this.$refs["paramValue-" + param.name][0];
                    let paramValueInner = paramValue.$el.querySelector(".el-input__inner");
                    if (paramValueInner && this.$utils.checkOverflow(paramValueInner)) {
                        this.paramValueTips[param.name] = true;
                    }
                }
            }
        },
        onContentBodyWheel(event) {
            if (this.contentBodyOverflow && !event.ctrlKey) {
                event.stopPropagation();
            }
        },
    }

}
</script>

<style scoped>
:focus {
    outline: none;
}

.content {
    min-width: 60px;
    max-width: 250px;
    background-color: #99ccff;
    border: 1px solid #8fc3fa;
    border-radius: 5px;
    font-size: 14px;
    white-space: nowrap;
    padding-left: 0;
    --scrollbar-thumb-color: #a2caf6;
    --scrollbar-thumb-shadow-color: #776eee;
}

.content:hover {
    background-color: #65adf6;
    border-color: #5da3ec;
}

.content.selected {
    background-color: #c0acf8;
    border-color: #b69ffa;
    --scrollbar-thumb-color: #c9b7fc;
    --scrollbar-thumb-shadow-color: #916cf6;
}

.content.error {
    box-shadow: 0 0 0 1px #fd7f5a;
}

.content > div {
    padding: 0 12px 0 23px;
    margin-left: -1px;
}

:not(.can-fold).content > div {
    padding: 0 12px 0 12px !important;
}

.content-header {
    color: #525456;
    line-height: 30px;
    overflow: hidden;
    text-overflow: ellipsis;
}

.content-body {
    border-top: 1px solid;
    border-top-color: inherit;
    overflow-y: auto;
}

.content-body::-webkit-scrollbar {
    width: 7px;
}

/*noinspection CssUnresolvedCustomProperty*/
.content-body::-webkit-scrollbar-thumb {
    border-radius: 5px;
    background-color: var(--scrollbar-thumb-color);
    box-shadow: inset 0 0 3px var(--scrollbar-thumb-shadow-color);
}

.content-body::-webkit-scrollbar-track {
    border-radius: 5px;
    background: #ededed;
}

.fold-self-icon {
    position: absolute;
    top: 0;
    left: 0;
    width: 20px;
    height: 24px;
    padding-top: 7px;
    padding-left: 4px;
    cursor: pointer;
}

.fold-children-icon {
    position: absolute;
    top: calc(50% - 7px);
    left: calc(100% - 1px);
    cursor: pointer;
}

.el-form {
    margin: 4px 12px 4px 0;
}

.el-form-item {
    margin-bottom: 0;
}

.paramLabel {
    display: inline-block;
    max-width: 72px;
    overflow: hidden;
    text-overflow: ellipsis;
}

>>> .el-form-item__label {
    height: 30px;
}

>>> .el-form-item__label:before {
    vertical-align: super;
}

.el-input, .el-input-number, .el-select, .el-radio-group {
    width: 120px;
}

/*>>>:vue css深度选择器*/
.el-input >>> input, .el-input-number >>> input, .el-select-normal >>> input {
    height: 24px !important;
    line-height: 24px;
}

.el-input >>> .el-input__inner {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
}

.el-select-multiple {
    margin-bottom: 10px;
}

.el-select-multiple >>> input {
    padding-top: 2px;
    min-height: 28px !important;
    line-height: 28px;
}

.el-input-number >>> span {
    margin-top: 2px;
    height: 22px;
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