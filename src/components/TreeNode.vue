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
               @paste.native="node.selected&&$emit('paste')"
               @contextmenu.stop.native="showMenu($event.clientX,$event.clientY)">
        <template>
            <el-badge is-dot :hidden="hiddenBreakPoint" :type="breakPointType">
                <div ref="content"
                     class="content"
                     :class="contentClasses">
                    <span>{{ node.template.name }}</span>
                    <span v-if="node.tree&&node.tree.showNodeId">({{ node.id }})</span>
                    <span v-if="node.comment">: {{ node.comment }}</span>
                </div>
            </el-badge>
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
            contentClasses: {
                selected: this.node.selected,
                running: this.node.running,
                error: this.node.errorParams.size > 0
            },
            menuShown: false,
            pointerEvents: "auto",
        };
    },
    mounted() {
        this.contentClasses.selected = this.node.selected || this.node.creating;
        this.resizeObserver = new ResizeObserver(async () => this.$emit("resize"));
        this.resizeObserver.observe(this.$refs.content);
    },
    beforeDestroy() {
        if (this.node.selected) {
            this.node.selected = false;//在这里修改，监听器不会触发
            clipboard.onSelectedNode(this.node);
            this.$emit("selected", this.node)
        }
    },
    destroyed() {
        this.resizeObserver.disconnect();
    },
    watch: {
        'node.selected'() {
            this.contentClasses.selected = this.node.selected || this.node.creating;
            clipboard.onSelectedNode(this.node);
            this.$emit("selected", this.node)
        },
        'node.running'(running) {
            this.contentClasses.running = running;
        },
        'node.errorParams'() {
            this.contentClasses.error = this.node.errorParams.size > 0;
        },
    },
    computed: {
        hiddenBreakPoint() {
            return !this.node.tree.debugging || this.node.breakPointState === 0;
        },
        breakPointType() {
            return this.node.breakPointState === 1 ? "danger" : "info";
        }
    },
    methods: {
        onDragStart(event) {
            this.node.dragging = true;
            this.pointerEvents = "none"
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
            this.pointerEvents = "auto"
            this.$utils.visitSubtree(this.node, node => node.z = 1);
            this.$utils.saveTree(this.node.tree);
            this.$emit("drag-end", event);
        },
        onMouseDown(event) {
            if (event.button === 0 && event.ctrlKey) {
                this.node.selected = !this.node.selected;
            } else {
                clipboard.selectNode(this.node, true, !event.ctrlKey);
            }
        },
        showMenu(x, y) {
            let items = [];
            let debugging = this.node.tree.debugging;

            if (debugging) {
                if (this.node.breakPointState === 0) {
                    items.push({
                        label: "添加断点",
                        handler: () => {
                            if (this.node.breakPointState === 0) {
                                this.node.breakPointState = 1;
                                this.node.tree.breakPointCount++;
                                this.node.tree.usableBreakPointCount++;
                            }
                        }
                    });
                }
                if (this.node.breakPointState !== 0) {
                    items.push({
                        label: "删除断点",
                        handler: () => {
                            if (this.node.breakPointState !== 0) {
                                this.node.breakPointState = 0;
                                this.node.tree.breakPointCount--;
                            }
                        }
                    });
                }
                if (this.node.breakPointState > 0) {
                    items.push({
                        label: "禁用断点",
                        handler: () => {
                            if (this.node.breakPointState > 0) {
                                this.node.breakPointState = -1;
                                this.node.tree.usableBreakPointCount--;
                            }
                        }
                    });
                }
                if (this.node.breakPointState < 0) {
                    items.push({
                        label: "启用断点",
                        handler: () => {
                            if (this.node.breakPointState < 0) {
                                this.node.breakPointState = 1;
                                this.node.tree.usableBreakPointCount++;
                            }
                        }
                    });
                }
            }

            if (this.node.children.length) {
                items.push({
                    label: this.node.childrenFolded ? '展开子树' : '收起子树',
                    handler: this.foldChildren
                });
            }

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
                    this.node.selected = false;
                }
            });
            this.menuShown = true;
        },
        foldChildren() {
            this.node.childrenFolded = !this.node.childrenFolded;
            this.node.tree.childrenFolded = this.node.tree.childrenFolded || this.node.childrenFolded;
            this.$utils.saveTree(this.node.tree);
            this.$emit("children-fold", this.node);
        }
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
    margin-left: -1px;
    padding: 0 12px;
    color: #525456;
    line-height: 30px;
    overflow: hidden;
    text-overflow: ellipsis;
}

.content:hover {
    background-color: #77b5f3;
    border-color: #4a9bf1;
}

.content.selected {
    background-color: #c0acf8;
    border-color: #9f81f8;
}

.content.running {
    background-color: #fd5e5eff;
    border-color: #f3143e;
}

.content.error {
    box-shadow: 0 0 0 1px #fd7f5a;
}

.fold-children-icon {
    position: absolute;
    top: calc(50% - 7px);
    left: calc(100% - 1px);
    cursor: pointer;
}

</style>
