<template>
    <draggable :x="node.x"
               :y="node.y"
               :init-dragging="temp"
               :style="{'pointer-events':temp?'none':'auto'}"
               @drag-start="onDragStart"
               @dragging="onDragging"
               @drag-end="onDragEnd"
               @contextmenu.native.stop="onContextMenu">
        <template>
            <div v-if="temp" class="content" ref="content">
                tid:{{ node.tid }},id:{{ node.id }}
            </div>
            <div v-else class="content" ref="content">
                <div>
                    <span>节点:{{ node.tid }}-{{ node.id }}</span>
                </div>
                <template v-if="node.detailed">
                    <div>
                        参数1:aaaaaaaaa{{ node.id }}
                    </div>
                    <div>
                        参数2:bbbbbbbbb{{ node.id }}
                    </div>
                    <div>
                        参数3:cccccccc{{ node.id }}
                    </div>
                </template>
            </div>
            <div @mousedown.stop
                 @click="onDetail"
                 class="detail-icon"
                 :class="node.detailed?'el-icon-arrow-up':'el-icon-arrow-down'"
                 :title="this.node.detailed ? '收起节点' : '展开节点'"/>
            <div v-if="node.children&&node.children.length"
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
        temp: {
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
            this.$set(this.node, "detailed", !this.node.detailed);
            this.$emit("detail");
        },
        onCollapse() {
            this.$set(this.node, "collapsed", !this.node.collapsed);
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
}

.content div {
    padding: 0 12px 0 23px;
}

.content div:nth-child(2) {
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
</style>