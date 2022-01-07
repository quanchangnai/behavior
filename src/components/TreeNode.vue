<template>
    <draggable :x="node.x"
               :y="node.y"
               :ready="creating"
               :style="nodeStyle"
               @drag-start="onDragStart"
               @dragging="onDragging"
               @drag-end="onDragEnd"
               @dblclick.native.stop="foldSelf"
               @contextmenu.native.stop="onContextMenu">
        <template>
            <div ref="content" class="content" :class="{'no-fold-operation-content': !hasFoldOperation()}">
                <div style="overflow:hidden;text-overflow: ellipsis;">
                    {{ node.template.name }}
                    <template v-if="node.folded && node.name"> : {{ node.name }}</template>
                </div>
                <div v-if="hasFoldOperation()&&!node.folded">
                    <el-form size="mini"
                             :model="node"
                             ref="form"
                             label-width="auto"
                             label-position="left"
                             @validate="onFormValidate"
                             @mousedown.native.stop
                             @dblclick.native.stop>
                        <el-form-item v-if="node.template.nodeName"
                                      label="节点名称"
                                      prop="name">
                            <el-input v-model="node.name"/>
                        </el-form-item>
                        <el-form-item v-for="(param,paramName) in node.template.params"
                                      :key="paramName"
                                      :rules="paramRules(param)"
                                      :show-message="false"
                                      :prop="'params.'+paramName">
                            <template #label>
                                <span class="paramLabel">{{ param.label || paramName }}奥德赛奥德赛</span>
                            </template>
                            <el-radio-group v-if="param.type==='boolean' && !param.options"
                                            v-model="node.params[paramName]">
                                <el-radio :label="true">是</el-radio>
                                <el-radio :label="false">否</el-radio>
                            </el-radio-group>
                            <!--suppress JSUnresolvedVariable -->
                            <el-select v-else-if="Array.isArray(param.options)"
                                       v-model="node.params[paramName]"
                                       :multiple="Array.isArray(param.value)"
                                       :class="paramSelectClass(paramName)"
                                       @visible-change="visible=>visible?node.z=200:node.z=1"
                                       :popper-append-to-body="false">
                                <el-option v-for="(option,i) in param.options"
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
                                        :disabled="typeof param.pattern!=='string'||param.pattern.length===0"
                                        :content="'格式:'+param.pattern"
                                        :arrowOffset="15"
                                        :hide-after="1000"
                                        popper-class="node-param-tooltip"
                                        placement="bottom-start">
                                <el-input v-model="node.params[paramName]"
                                          @focusin.native="()=>onParamFocusIn(paramName)"
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
                 :class="node.folded?'el-icon-arrow-down':'el-icon-arrow-up'"
                 :title="node.folded?'展开节点':'收起节点'"/>
            <div v-if="node.children.length"
                 @mousedown.stop
                 @dblclick.stop
                 @click="foldChildren"
                 class="fold-children-icon"
                 :class="node.childrenFolded?'el-icon-circle-plus-outline':'el-icon-remove-outline'"
                 :title="node.childrenFolded?'展开子树':'收起子树'"/>
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
            backupParams: {},
            validations: {}
        };
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
            return {'pointer-events': this.creating ? 'none' : 'auto', 'z-index': this.node.z};
        }
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
            return this.node.template.nodeName || Object.keys(this.node.params).length > 0;
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
            this.$emit("delete", this.node);
        },
        onContextMenu(event) {
            this.node.z = 30;
            this.$refs.menu.show(event.clientX, event.clientY);
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
        onParamFocusIn(paramName) {
            this.backupParams[paramName] = this.node.params[paramName];
        },
        onParamFocusOut(paramName) {
            if (this.validations['params.' + paramName] === false) {
                this.node.params[paramName] = this.backupParams[paramName];
                this.validations['params.' + paramName] = true;
            }
        },
        onFormValidate(prop, pass) {
            this.validations[prop] = pass;
        }
    }

}
</script>

<!--suppress CssUnusedSymbol -->
<style scoped>
.content {
    min-width: 60px;
    background-color: #99ccff;
    line-height: 30px;
    border: 1px solid #98a5e9;
    border-radius: 5px;
    font-size: 14px;
    white-space: nowrap;
    max-width: 250px;
}

.content > div {
    padding: 0 12px 0 23px;
}

.content > div:nth-child(2) {
    border-top: solid cadetblue 1px;
}

.no-fold-operation-content > div {
    padding: 0 12px 0 12px !important;
}


.content:hover {
    cursor: grab;
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
    cursor: default;
    margin: 5px 10px 7px 0;
}

.el-form-item {
    margin-bottom: 0;
}

.paramLabel {
    display: inline-block;
    max-width: 70px;
    overflow: hidden;
    text-overflow: ellipsis;
}

.el-input, .el-input-number, .el-select, .el-radio-group {
    width: 120px;
}

/*>>>:vue css深度选择器*/
.el-input >>> input, .el-input-number >>> input, .el-select-normal >>> input {
    height: 24px !important;
    line-height: 24px;
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

>>> .el-select-dropdown {
    top: calc(100% - 8px) !important;
    left: 0 !important;
}

>>> .el-select-dropdown__item {
    height: 24px;
    line-height: 24px;
}

>>> .popper__arrow {
    left: 10px !important;
}
</style>
<style>
/*noinspection CssUnusedSymbol*/
.node-param-tooltip {
    transform: translateY(-8px);
    box-sizing: border-box;
    min-width: 120px;
    padding: 5px 10px;
}
</style>