<template>
    <draggable :x="node.x"
               :y="node.y"
               :ready="node.creating"
               :style="{'z-index':node.z,'pointer-events':pointerEvents}"
               :scale="!node.creating&&node.tree.scale||1"
               @drag-start="onDragStart"
               @dragging="onDragging"
               @drag-end="onDragEnd"
               @mousedown.capture.native="onMouseDown"
               @dblclick.stop.native
               @dblclick.exact.stop.native="foldSelf"
               @paste.native="selected&&$emit('paste')"
               @contextmenu.stop.native="showMenu($event.clientX,$event.clientY)">
        <template>
            <div ref="content"
                 class="content"
                 :class="contentClasses">
                <div ref="contentHeader" class="content-header">
                    <span>{{ node.template.name }}</span>
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
                                                v-model="node.params[param.name]"
                                                @dblclick.stop.native>
                                    <el-radio :label="true">是</el-radio>
                                    <el-radio :label="false">否</el-radio>
                                </el-radio-group>
                                <!--suppress JSUnresolvedVariable -->
                                <el-select v-else-if="param.options"
                                           :ref="'paramValue-'+param.name"
                                           v-model="node.params[param.name]"
                                           :multiple="Array.isArray(param.default)"
                                           :class="paramSelectClass(param.name)"
                                           @dblclick.stop.native
                                           @copy.stop.native
                                           @paste.stop.native
                                           @change="onParamSelectChange"
                                           @visible-change="onParamDropdownVisibleChange('paramValue-'+param.name,$event)"
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
import clipboard from "@/render/clipboard";

// noinspection JSUnresolvedVariable
export default {
    name: "TreeNode",
    components: {Draggable},
    props: {
        node: Object
    },
    data() {
        return {
            selected: false,
            contentClasses: {
                selected: false,
                running: this.node.running,
                error: false,
                'can-fold': false
            },
            contentBodyHeight: 0,
            contentHeaderOverflow: false,
            paramValidations: {},//参数校验状态
            paramLabelTips: {},//参数标签提示状态，文本太长时加提示
            paramValueTips: {},//参数值示状态
            commentTips: false,
            menuShown: false,
            pointerEvents: "auto"
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

        this.contentClasses.selected = this.selected || this.node.creating;
        this.contentClasses['can-fold'] = this.canFold();
        this.checkParamsError();
    },
    destroyed() {
        this.resizeObserver.disconnect();
        clipboard.selectedNodes?.delete(this.node.id);
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
            this.contentClasses.selected = this.selected || this.node.creating;
            clipboard.onNodeSelect(this.node, this.selected);
        },
        'node.running': function (running) {
            this.contentClasses.running = running;
        }
    },
    methods: {
        onDragStart(event) {
            this.node.dragging = true;
            this.pointerEvents = "none";
            this.$emit("drag-start", event);
        },
        onDragging(event) {
            const deltaX = event.x - this.node.x;
            const deltaY = event.y - this.node.y;

            this.$utils.visitSubtree(this.node, node => {
                node.x += deltaX;
                node.y += deltaY;
                node.z = 20;
            });

            this.$emit("dragging", event);
        },
        onDragEnd(event) {
            this.node.dragging = false;
            this.pointerEvents = "auto";
            this.$utils.visitSubtree(this.node, node => node.z = 1);
            this.$utils.saveTree(this.node.tree);
            this.$emit("drag-end", event);
        },
        onMouseDown(event) {
            if (event.button === 0 && event.ctrlKey) {
                this.selected = !this.selected;
            } else {
                this.selected = true;
            }
        },
        canFold() {
            if (this.node.creating) {
                return false;
            }
            let template = this.node.template;
            return template.comment || template.params?.length > 0;
        },
        showMenu(x, y) {
            let items = [];

            if (this.canFold()) {
                items.push({
                    label: this.node.folded ? '展开节点' : '收起节点',
                    shortcut: "双击",
                    handler: this.foldSelf
                });
            }

            if (this.node.children.length) {
                items.push({
                    label: this.node.childrenFolded ? '展开子树' : '收起子树',
                    handler: this.foldChildren
                });
            }

            let debugging = this.node.tree.nodes != null;

            items.push({
                label: "剪切子树",
                shortcut: "Ctrl+X",
                disabled: debugging || !this.node.parent || clipboard.selectedType !== "hasSubtrees",
                handler: () => this.$emit("cut-subtrees")
            });

            items.push({
                label: "剪切节点",
                shortcut: "Ctrl+Shift+X",
                disabled: debugging || !this.node.parent,
                handler: () => this.$emit("cut-nodes")
            });

            items.push({
                label: '复制子树',
                shortcut: "Ctrl+C",
                disabled: clipboard.selectedType !== "hasSubtrees",
                handler: () => this.$emit("copy-subtrees")
            });

            items.push({label: '复制节点', shortcut: "Ctrl+Shift+C", handler: () => this.$emit("copy-nodes")});

            items.push({
                label: "粘贴",
                shortcut: "Ctrl+V",
                disabled: debugging || !clipboard.copiedNodes || !clipboard.copiedNodes.length,
                handler: () => this.$emit("paste")
            });

            items.push({
                label: "删除子树",
                shortcut: "Del",
                disabled: debugging || !this.node.parent || clipboard.selectedType !== "hasSubtrees",
                handler: () => this.$emit("delete-subtrees")
            });

            items.push({
                label: "删除节点",
                shortcut: "Ctrl+Del",
                disabled: debugging || !this.node.parent,
                handler: () => this.$emit("delete-nodes")
            });

            items.push({
                label: '定位模板',
                disabled: !this.node.template.visible,
                handler: () => this.$events.$emit("position-template", this.node.tid)
            });

            this.$emit("menu", x, y, items, event => {
                this.menuShown = false;
                if (!event.ctrlKey && !event.clickItem) {
                    this.selected = false;
                }
            });
            this.menuShown = true;
        },
        foldSelf() {
            if (!this.canFold()) {
                return;
            }

            this.node.folded = !this.node.folded;
            this.node.tree.folded = 0;

            this.$utils.visitSubtree(this.node.tree.root, node => {
                if (node.template.comment || Object.keys(node.params).length > 0) {
                    this.node.tree.folded |= node.folded ? 1 : 2;
                }
                return !node.childrenFolded;
            });

            this.$utils.saveTree(this.node.tree);
            this.$emit("fold");
        },
        foldChildren() {
            this.node.childrenFolded = !this.node.childrenFolded;
            this.node.tree.childrenFolded = this.node.tree.childrenFolded || this.node.childrenFolded;
            this.$utils.saveTree(this.node.tree);
            this.$emit("children-fold", this.node);
        },
        paramLabelStyle(paramName) {
            let style = {};
            if (this.paramValidations['params.' + paramName] === false) {
                style.color = "#fd7f5a";
            }
            return style
        },
        paramSelectClass(paramName) {
            let param = this.node.params[paramName];
            // noinspection JSUnresolvedVariable
            let normal = !Array.isArray(param) || Array.isArray(param) && param.length === 0;
            return {"el-select-normal": normal, "el-select-multiple": !normal}
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
        onParamSelectChange() {
            setTimeout(this.calcContentBodyHeight, 10);
        },
        onParamDropdownVisibleChange(ref, visible) {
            this.node.z = visible ? 200 : 1;
            if (visible) {
                this.$emit("param-dropdown-show", this.$refs[ref][0]);
            }
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

            this.contentClasses.error = error;
        },
        async calcContentBodyHeight() {
            await this.$nextTick();

            this.contentBodyOverflow = false;

            let form = this.$refs.form;
            if (!form) {
                return;
            }

            //手动计算高度，多余4个表单项加滚动条，并且防止表单项部分显示
            this.contentBodyHeight = 3;

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
            if (this.node.creating || !this.node.comment) {
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
        onContentBodyWheel(event) {
            if (this.contentBodyOverflow && !event.ctrlKey) {
                event.stopPropagation();
            }
        },
    }

}
</script>

<style scoped>
.content {
    min-width: 60px;
    max-width: 250px;
    background-color: #99ccff;
    border: 1px solid #63abf6;
    border-radius: 5px;
    font-size: 14px;
    white-space: nowrap;
    padding-left: 0;
    --content-body-border-color: #88c0f8;
    --scrollbar-thumb-color: #a2caf6;
    --scrollbar-thumb-shadow-color: #776eee;
}

.content:hover {
    background-color: #65adf6;
    border-color: #3998fc;
    --content-body-border-color: #51a4f8;
}

.content.selected {
    background-color: #c0acf8;
    border-color: #9f81f8;
    --content-body-border-color: #b69ff6;
    --scrollbar-thumb-color: #c9b7fc;
    --scrollbar-thumb-shadow-color: #916cf6;
}

.content.running {
    background-color: #fd5e5eff;
    border-color: #f3143e;
    --content-body-border-color: #f14969;
    --scrollbar-thumb-color: #f8728a;
    --scrollbar-thumb-shadow-color: #ee0833;
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
    border-top-color: var(--content-body-border-color);
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