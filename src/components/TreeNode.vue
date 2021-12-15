<template>
    <draggable :x="node.x"
               :y="node.y"
               :init-dragging="creating"
               :style="{'pointer-events':creating?'none':'auto'}"
               @drag-start="onDragStart"
               @dragging="onDragging"
               @drag-end="onDragEnd"
               @contextmenu.native.stop="onContextMenu">
        <template>
            <div v-if="creating" ref="content" class="creating-content content">
                {{ node.template.name }} - {{ node.id }}
            </div>
            <div v-else ref="content" class="content">
                <div>
                    {{ node.template.name }}<span v-if="node.name"> : {{ node.name }}</span> - {{ node.id }}
                </div>
                <div v-if="node.detailed">
                    <el-form ref="form"
                             size="mini"
                             label-width="70px"
                             label-position="left">
                        <el-form-item label="活动名称">
                            <el-input></el-input>
                        </el-form-item>
                        <el-form-item label="活动区域">
                            <el-select placeholder="请选择活动区域">
                                <el-option label="区域一" value="shanghai"></el-option>
                                <el-option label="区域二" value="beijing"></el-option>
                                <el-option label="区域三" value="beijing"></el-option>
                            </el-select>
                        </el-form-item>
                        <el-form-item label="特殊资源">
                            <el-radio-group>
                                <el-radio label="是"></el-radio>
                                <el-radio label="否 "></el-radio>
                            </el-radio-group>
                        </el-form-item>
                        <el-form-item>
                            <el-button type="primary">提交</el-button>
                            <el-button type="info">重置</el-button>
                        </el-form-item>
                    </el-form>
                </div>
            </div>
            <div v-if="!creating"
                 @mousedown.stop
                 @click="onDetail"
                 class="detail-icon"
                 :class="node.detailed?'el-icon-arrow-up':'el-icon-arrow-down'"
                 :title="this.node.detailed ? '收起节点' : '展开节点'"/>
            <div v-if="node.children.length"
                 @mousedown.stop
                 @click="onCollapse"
                 class="collapse-icon"
                 :class="node.collapsed?'el-icon-circle-plus-outline':'el-icon-remove-outline'"
                 :title="this.node.collapsed ? '展开子树' : '收起子树'"/>
            <context-menu ref="menu" :items="menuItems"/>
        </template>
    </draggable>
</template>

<script>
import Draggable from './Draggable'
import ContextMenu from './ContextMenu'

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
            items.push({title: this.node.detailed ? '收起节点' : '展开节点', handler: this.onDetail});
            if (this.node.tree && this.node === this.node.tree.root) {
                items.push({title: this.node.tree.detailed ? '收起全部节点' : '展开全部节点', handler: this.onDetailAll});
            }
            if (this.node.children && this.node.children.length) {
                items.push({title: this.node.collapsed ? '展开子树' : '收起子树', handler: this.onCollapse});
            }
            if (this.node.parent) {
                items.push({title: '删除节点', handler: this.onDelete});
            }
            return items;
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

            const move = node => {
                node.x += deltaX;
                node.y += deltaY;
                if (node.children) {
                    for (let child of node.children) {
                        move(child);
                    }
                }
            };

            move(this.node);

            this.$emit("dragging", this.node);
        },
        onDragEnd() {
            this.node.dragging = false;
            this.$emit("drag-end", this.node);
        },
        onDetail() {
            this.node.detailed = !this.node.detailed;
            this.$emit("detail");
        },
        onDetailAll() {
            this.node.tree.detailed = !this.node.tree.detailed;
            let detail = node => {
                node.detailed = this.node.tree.detailed;
                if (node.children) {
                    for (let child of node.children) {
                        detail(child);
                    }
                }
            };
            detail(this.node);
            this.$emit("detail");
        },
        onCollapse() {
            this.node.collapsed = !this.node.collapsed;
            this.$emit("collapse");
        },
        onDelete() {
            this.$emit("delete", this.node);
        },
        onContextMenu(event) {
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
    z-index: 10;
    font-size: 14px;
}

.creating-content {
    padding: 0 12px 0 12px;
}

.content div {
    padding: 0 12px 0 23px;
}

.content > div:nth-child(2) {
    border-top: solid cadetblue 1px;
}


.content:hover {
    cursor: grab;
}

.detail-icon {
    position: absolute;
    top: 0;
    left: 0;
    width: 20px;
    height: 24px;
    padding-top: 7px;
    padding-left: 4px;
    cursor: pointer;
}

.collapse-icon {
    position: absolute;
    top: calc(50% - 7px);
    left: calc(100% - 1px);
    cursor: pointer;
}

.el-form {
    padding: 5px 10px 10px 0;
}

.el-form-item {
    padding: 3px 0 !important;
    margin-bottom: 0;
    /*border: solid red 1px;*/
}

.el-input, .el-select, .el-radio-group {
    padding: 0 !important;
    width: 160px;
}

</style>