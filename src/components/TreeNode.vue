<template>
    <draggable :x="node.x"
               :y="node.y"
               :ready="creating"
               :style="nodeStyle"
               @drag-start="onDragStart"
               @dragging="onDragging"
               @drag-end="onDragEnd"
               @mousedown.native="selected=true"
               @dblclick.native.stop="foldSelf"
               @contextmenu.native.stop="onContextMenu">
        <template>
            <div ref="content"
                 :style="contentStyle"
                 class="content"
                 :class="{'no-fold-operation-content': !hasFoldOperation()}">
                <div class="content-header">
                    {{ node.template.name }}
                    <template v-if="node.folded && node.comment">
                        : {{ node.comment }}
                    </template>
                </div>
                <div class="content-body"
                     @wheel="onContentBodyWheel"
                     :style="{'height':contentBodyHeight+'px'}"
                     v-if="hasFoldOperation()&&!node.folded">
                    <el-form size="mini"
                             :model="node"
                             ref="form"
                             label-width="auto"
                             label-position="left"
                             :hide-required-asterisk="false"
                             @validate="onFormValidate"
                             @mousedown.native.stop
                             @dblclick.native.stop>
                        <el-form-item v-if="node.template.comment" prop="comment">
                            <template #label>
                                <span class="paramLabel">节点备注</span>
                            </template>
                            <el-input v-model="node.comment"/>
                        </el-form-item>
                        <el-form-item v-for="(param,paramName) in node.template.params"
                                      :key="paramName"
                                      :required="param.required"
                                      :rules="paramRules(param)"
                                      :show-message="false"
                                      :prop="'params.'+paramName">
                            <template #label>
                                <el-tooltip effect="light"
                                            :disabled="labelTips[paramName]!==true"
                                            :arrowOffset="15"
                                            :hide-after="1000"
                                            :content="param.label"
                                            popper-class="tooltip"
                                            placement="bottom-start">
                                    <span :ref="'paramLabel-'+paramName"
                                          class="paramLabel">
                                        {{ param.label || paramName }}
                                    </span>
                                </el-tooltip>
                            </template>
                            <el-radio-group v-if="param.type==='boolean' && !param.options"
                                            v-model="node.params[paramName]">
                                <el-radio :label="true">是</el-radio>
                                <el-radio :label="false">否</el-radio>
                            </el-radio-group>
                            <!--suppress JSUnresolvedVariable -->
                            <el-select v-else-if="param.options"
                                       :ref="'paramSelect-'+paramName"
                                       v-model="node.params[paramName]"
                                       :multiple="Array.isArray(param.default)"
                                       :class="paramSelectClass(paramName)"
                                       @remove-tag="calcContentBodyHeight"
                                       @visible-change="onParamSelectVisibleChange('paramSelect-'+paramName,$event)"
                                       popper-class="node-param-select-dropdown">
                                <el-option v-for="(option,i) in paramOptions(param.options)"
                                           :key="paramName+'-option-'+i"
                                           :label="option.label"
                                           :value="option.value"/>
                            </el-select>
                            <!--suppress JSUnresolvedVariable -->
                            <el-input-number v-else-if="param.type==='int' || param.type==='float'"
                                             v-model="node.params[paramName]"
                                             :precision="param.type==='float'?2:0"
                                             :min="typeof param.min==='number'?param.min:-Infinity"
                                             :max="typeof param.max==='number'?param.max:Infinity"/>
                            <el-tooltip v-else-if="param.type==='string'"
                                        effect="light"
                                        :disabled="!param.pattern||param.pattern.length===0"
                                        :content="'格式:'+param.pattern"
                                        :arrowOffset="15"
                                        :hide-after="1000"
                                        popper-class="tooltip node-param-tooltip"
                                        placement="bottom-start">
                                <el-input v-model="node.params[paramName]"
                                          @focusin.native="onParamFocusIn(paramName)"
                                          @focusout.native="onParamFocusOut(paramName)"/>
                            </el-tooltip>
                        </el-form-item>
                    </el-form>
                </div>
            </div>
            <div v-if="hasFoldOperation()"
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
            <context-menu ref="menu" :items="menuItems" @hide="node.z = 1"/>
        </template>
    </draggable>
</template>

<script>
import Draggable from './Draggable'
import ContextMenu from './ContextMenu'

// noinspection JSUnresolvedVariable
export default {
    name: "TreeNode",
    components: {Draggable, ContextMenu},
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
            backupParams: {},//备份的参数值，输入无效参数后回滚用
            validations: {},//参数校验状态
            labelTips: {},//参数标签提示状态，文本太长加提示
            contentStyle: {},
            contentBodyHeight: 0
        };
    },
    mounted() {
        window.addEventListener('mousedown', () => this.selected = false, {capture: true});
        this.resizeObserver = new ResizeObserver(async () => {
            await this.calcContentBodyHeight();
            this.$emit("resize");
        });
        this.resizeObserver.observe(this.$refs.content);
        this.calcContentStyle();
    },
    destroyed() {
        this.resizeObserver.disconnect();
    },
    computed: {
        menuItems() {
            let items = [];
            if (this.hasFoldOperation()) {
                items.push({title: this.node.folded ? '展开节点' : '收起节点', handler: this.foldSelf});
            }
            if (this.node.children.length) {
                items.push({title: this.node.childrenFolded ? '展开子树' : '收起子树', handler: this.foldChildren});
            }
            if (this.node.parent) {
                items.push({title: '删除节点', handler: this.delete});
            }
            return items;
        },
        nodeStyle() {
            return {
                'pointer-events': this.creating ? 'none' : 'auto',
                'z-index': this.node.z
            };
        }
    },
    watch: {
        'node.folded': function (folded) {
            if (!this.hasFoldOperation()) {
                return;
            }
            if (folded) {
                this.resizeObserver.unobserve(this.$refs.form.$el);
                this.labelTips = {};
            } else {
                this.$nextTick(() => {
                    this.resizeObserver.observe(this.$refs.form.$el);
                    this.checkParamLabelsOverflow();
                });
            }
        },
        selected() {
            this.calcContentStyle();
        },
    },
    methods: {
        content() {
            return this.$refs.content;
        },
        onDragStart() {
            this.node.dragging = true;
            this.$emit("drag-start", {node: this.node});

        },
        onDragging(event) {
            const deltaX = event.x - this.node.x;
            const deltaY = event.y - this.node.y;

            this.$utils.visitNodes(this.node, node => {
                node.x += deltaX;
                node.y += deltaY;
                node.z = this.creating ? 30 : 10;
            });

            this.$emit("dragging", this.node);
        },
        onDragEnd() {
            this.node.dragging = false;
            this.$utils.visitNodes(this.node, node => node.z = 1);
            this.$emit("drag-end", this.node);
        },
        hasFoldOperation() {
            if (this.creating) {
                return false;
            }
            let template = this.node.template;
            if (template.comment) {
                return true;
            }
            return template.params && Object.keys(template.params).length > 0;
        },
        select() {
            this.selected = true;
        },
        foldSelf() {
            if (this.hasFoldOperation()) {
                this.node.folded = !this.node.folded;
                this.$emit("fold");
            }
        },
        foldChildren() {
            this.node.childrenFolded = !this.node.childrenFolded;
            this.$emit("children-fold", this.node);
        },
        async delete() {
            if (this.node.children.length) {
                try {
                    await this.$confirm("确定删除该节点及其所有子孙节点？", {type: "warning"});
                } catch {
                    return;
                }
            }

            let index = this.node.parent.children.indexOf(this.node);
            this.node.parent.children.splice(index, 1);

            this.deleteParamOptionRefNode();

            this.$emit("delete", this.node);
        },
        onContextMenu(event) {
            this.node.z = 30;
            this.$refs.menu.show(event.clientX, event.clientY);
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
        deleteParamOptionRefNode() {
            //删除节点时检查其他节点的选项列表引用，删除无效引用
            let deletedNodeIds = new Set();
            this.$utils.visitNodes(this.node, node => deletedNodeIds.add(node.id));

            this.$utils.visitNodes(this.node.tree.root, node => {
                let params = node.template.params;
                if (!params) {
                    return;
                }
                for (let paramName of Object.keys(params)) {
                    let options = params[paramName].options;
                    if (!options || Array.isArray(options) || options.refType !== "node") {
                        continue;
                    }
                    if (deletedNodeIds.has(node.params[paramName])) {
                        node.params[paramName] = null;
                    }
                }
            });
        },
        paramOptions(options) {
            if (Array.isArray(options)) {
                //预定义的选项列表
                return options;
            }

            //options.refType==="node",选项列表引用节点
            let _options = [];
            this.$utils.visitNodes(this.node.tree.root, node => {
                if (node.tid === options.refId) {
                    _options.push({label: node.comment || node.template.name + "-" + node.id, value: node.id});
                }
            });

            return _options;

        },
        onParamFocusIn(paramName) {
            this.backupParams[paramName] = this.node.params[paramName];
        },
        onParamFocusOut(paramName) {
            if (this.validations['params.' + paramName] === false) {
                this.node.params[paramName] = this.backupParams[paramName];
                this.validations['params.' + paramName] = true;
            }
            this.calcContentStyle();
        },
        onFormValidate(prop, pass) {
            if (!pass) {
                this.validations[prop] = false;
            } else {
                delete this.validations[prop];
            }
            this.calcContentStyle();
        },
        calcContentStyle() {
            let error = Object.keys(this.validations).length > 0;
            let params = this.node.template.params;
            if (params && !this.creating) {
                for (let paramName of Object.keys(params)) {
                    if (params[paramName].required && this.node.params[paramName] === undefined) {
                        error = true;
                        break;
                    }
                }
            }

            this.contentStyle = {
                'background-color': this.selected || this.creating ? '#c0acf8' : '#99ccff',
                'border-color': this.selected || this.creating ? '#b69ffa' : '#84bcf6',
                'box-shadow': error ? '0 0 0 1px #fd7f5a' : '',
                '--scrollbar-thumb-color': this.selected ? '#c9b7fc' : '#a2caf6',
                '--scrollbar-thumb-shadow-color': this.selected ? '#916cf6' : '#776eee',
            }
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
        async checkParamLabelsOverflow() {
            if (!this.node.template.params) {
                return;
            }

            //等待参数渲染出来
            await this.$nextTick();

            for (let paramName of Object.keys(this.node.template.params)) {
                let param = this.node.template.params[paramName];
                let paramLabel = this.$refs["paramLabel-" + paramName];
                //required参数标签前的红色星号不知道什么原因导致clone.scrollWidth多了一个像素
                if (this.$utils.checkOverflow(paramLabel[0], "x", param.required ? 1 : 0)) {
                    this.labelTips[paramName] = true;
                }
            }
        },
        onContentBodyWheel(event) {
            if (this.contentBodyOverflow) {
                event.stopPropagation();
            }
        },
    }

}
</script>

<!--suppress CssUnusedSymbol -->
<style scoped>
.content {
    min-width: 60px;
    max-width: 250px;
    background-color: #99ccff;
    border: 1px solid #84bcf6;
    border-radius: 5px;
    font-size: 14px;
    white-space: nowrap;
    padding-left: 0;
}

.content > div {
    padding: 0 12px 0 23px;
    margin-left: -1px;
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

.no-fold-operation-content > div {
    padding: 0 12px 0 12px !important;
}

.content:hover {
    cursor: pointer;
}

.fold-self-icon {
    position: absolute;
    top: 0;
    left: 0;
    width: 20px;
    height: 24px;
    padding-top: 7px;
    padding-left: 4px;
    cursor: default;
}

.fold-children-icon {
    position: absolute;
    top: calc(50% - 7px);
    left: calc(100% - 1px);
    cursor: default;
}

.el-form {
    cursor: default;
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
.node-param-select-dropdown {
    transform: translateY(-7px);
}

.node-param-select-dropdown .el-select-dropdown__item {
    height: 24px;
    line-height: 24px;
}

.node-param-select-dropdown .popper__arrow {
    left: 10px !important;
}

.node-param-tooltip {
    min-width: 120px;
    transform: translateY(-8px);
}
</style>