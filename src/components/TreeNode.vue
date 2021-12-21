<template>
    <draggable :x="node.x"
               :y="node.y"
               :ready="creating"
               :style="style"
               @drag-start="onDragStart"
               @dragging="onDragging"
               @drag-end="onDragEnd"
               @dblclick.native="fold"
               @contextmenu.native.stop="onContextMenu">
        <template>
            <div ref="content" class="content" :class="{'creating-content':creating}">
                <div style="overflow:hidden;text-overflow: ellipsis;">
                    {{ node.template.name }}
                    <template v-if="node.folded && node.name"> : {{ node.name }}</template>
                </div>
                <div v-if="!node.folded">
                    <el-form size="mini"
                             label-width="auto"
                             label-position="left"
                             @mousedown.native.stop
                             @dblclick.native.stop>
                        <el-form-item label="节点名称">
                            <el-input v-model="node.name"/>
                        </el-form-item>
                        <el-form-item v-for="(param,paramName) in node.template.params"
                                      :label="param.label?param.label:paramName"
                                      :key="paramName">
                            <el-radio-group v-if="typeof param.value==='boolean'"
                                            v-model="node.params[paramName]">
                                <el-radio :label="true">是</el-radio>
                                <el-radio :label="false">否</el-radio>
                            </el-radio-group>
                            <el-select v-else-if="param.options&&param.options.length"
                                       v-model="node.params[paramName]"
                                       :popper-append-to-body="false">
                                <el-option v-for="(option,i) in param.options"
                                           :key="paramName+'-option-'+i"
                                           :label="option.label"
                                           :value="option.value"/>
                            </el-select>
                            <el-input-number v-else-if="typeof param.value==='number'"
                                             v-model="node.params[paramName]"/>
                            <el-input v-else v-model="node.params[paramName]"/>
                        </el-form-item>
                    </el-form>
                </div>
            </div>
            <div v-if="!creating"
                 @mousedown.stop
                 @click="fold"
                 class="fold-icon"
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
import utils from "@/utils";

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
        return {};
    },
    computed: {
        menuItems() {
            let items = [];
            items.push({title: this.node.folded ? '展开节点' : '收起节点', handler: this.fold});
            if (this.node.children.length) {
                items.push({title: this.node.childrenFolded ? '展开子树' : '收起子树', handler: this.foldChildren});
            }
            if (this.node.parent) {
                items.push({title: '删除节点', handler: this.delete});
            }
            return items;
        },
        style() {
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

            utils.visitNodes(this.node, node => {
                node.x += deltaX;
                node.y += deltaY;
                node.z = 100;
            });

            this.$emit("dragging", this.node);
        },
        onDragEnd() {
            this.node.dragging = false;
            utils.visitNodes(this.node, node => node.z = 1);
            this.$emit("drag-end", this.node);
        },
        fold() {
            this.node.folded = !this.node.folded;
            this.$emit("fold");
        },
        foldChildren() {
            this.node.childrenFolded = !this.node.childrenFolded;
            this.$emit("children-fold", this.node);
        },
        delete() {
            let index = this.node.parent.children.indexOf(this.node);
            this.node.parent.children.splice(index, 1);
            this.$emit("delete", this.node);
        },
        onContextMenu(event) {
            this.node.z = 10;
            this.$refs.menu.show(event.clientX, event.clientY);
        }
    }

}
</script>

<style scoped>
.content {
    min-width: 60px;
    background-color: #99ccff;
    line-height: 30px;
    border: 1px solid #98a5e9;
    border-radius: 5px;
    font-size: 14px;
    white-space: nowrap;
    max-width: 235px;
}

.content > div {
    padding: 0 12px 0 23px;
}

.content > div:nth-child(2) {
    border-top: solid cadetblue 1px;
}

.creating-content > div {
    padding: 0 12px 0 12px !important;
}


.content:hover {
    cursor: grab;
}

.fold-icon {
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

/*noinspection CssUnusedSymbol*/
.el-form {
    cursor: default;
    margin: 5px 10px 7px 0;
}

/*noinspection CssUnusedSymbol*/
.el-form-item {
    padding: 0 !important;
    margin-bottom: 0;
}

/*noinspection CssUnusedSymbol*/
.el-input, .el-input-number, .el-select, .el-radio-group {
    width: 120px;
}

/*>>>:vue css深度选择器*/
.el-input >>> input, .el-input-number >>> input, .el-select >>> input {
    height: 24px;
}

.el-input-number >>> span {
    margin-top: 2px;
    height: 22px;
}

/*noinspection CssUnusedSymbol*/
>>> .el-select-dropdown {
    top: 20px !important;
    left: 0 !important;
}

/*noinspection CssUnusedSymbol*/
>>> .el-select-dropdown__item {
    height: 24px;
    line-height: 24px;
}

</style>