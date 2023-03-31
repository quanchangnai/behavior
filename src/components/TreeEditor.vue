<template>
    <div ref="body" class="tree-editor" v-loading.fullscreen="config===null">
        <div class="left" :style="{width:leftWidth+'px'}">
            <tree-list v-if="config"
                       ref="treeList"
                       :archetypes="config.archetypes"
                       @selected-tree="onSelectedTree"/>
        </div>
        <div class="center"
             ref="center"
             tabindex="-1"
             autofocus="autofocus"
             @mouseenter="$event.currentTarget.focus()"
             @keydown.ctrl="onCtrlKeyDown"
             @keyup.control="onCtrlKeyUp"
             @wheel.exact="onCenterWheel"
             @dblclick="resetBoard"
             :style="{left:leftWidth+'px',right:rightWidth+'px'}">
            <draggable class="board"
                       ref="board"
                       :x="boardX"
                       :y="boardY"
                       :style="boardStyle"
                       @drag-start="hideNodeParamDropdown"
                       @drag-end="onBoardDragEnd"
                       @contextmenu.native="showBoardMenu"
                       @mouseup.native="onBoardMouseUp"
                       @cut.native="deleteSubtrees(true)"
                       @copy.native="copySubtrees"
                       @wheel.ctrl.exact.native="onBoardWheel">
                <canvas ref="canvas"/>
                <tree-node v-for="node in visibleNodes"
                           :node="node"
                           :key="tree.id+'-'+node.id"
                           :ref="'node-'+node.id"
                           @drag-start="onNodeDragStart(node)"
                           @dragging="onNodeDragging($event,node)"
                           @drag-end="onNodeDragEnd(node)"
                           @selected="setCurrentNode"
                           @run="setCurrentNode"
                           @menu="showNodeMenu"
                           @cut-subtrees="deleteSubtrees(true)"
                           @cut-nodes="deleteNodes(true)"
                           @copy-subtrees="copySubtrees"
                           @copy-nodes="copyNodes"
                           @paste="pasteNodes(node)"
                           @delete-subtrees="deleteSubtrees"
                           @delete-nodes="deleteNodes"
                           @resize="drawTree"
                           @children-fold="drawTree"
                           @mouseenter.native="mouseoverNode=node"
                           @mouseleave.native="mouseoverNode=null"
                           @mouseup.native="onNodeMouseUp($event,node)"
                           @param-dropdown-show="onNodeParamDropdownShow"/>
            </draggable>
            <debug-bar ref="debugBar"/>
            <tree-node-detail v-if="currentNode" :node="currentNode"/>
        </div>
        <div class="right" :style="{width:rightWidth+'px'}">
            <template-list v-if="config"
                           ref="templateList"
                           :templates="config.templates"
                           :template-types="config.templateTypes"
                           :template-groups="config.templateGroups"
                           @select-template="onSelectTemplate"/>
        </div>
        <tree-node v-if="creatingNode!=null"
                   :ref="'node-'+creatingNode.id"
                   :node="creatingNode"
                   style="transform-origin: 0 0"
                   :style="{transform:`scale(${boardScale},${boardScale})`}"
                   @dragging="onNodeDragging($event,creatingNode)"/>
        <context-menu ref="boardMenu"/>
        <context-menu ref="nodeMenu"/>
    </div>
</template>

<script>
import {ipcRenderer} from 'electron'
import clipboard from "@/render/clipboard";
import Draggable from "./Draggable";
import ContextMenu from "./ContextMenu";
import DebugBar from "@/components/DebugBar.vue";
import TreeList from "./TreeList";
import TemplateList from "./TemplateList";
import TreeNode from "./TreeNode";
import TreeNodeDetail from "@/components/TreeNodeDetail.vue";

const board_edge_space = 100;//画板边缘空间
const left_width = 220;//左侧行为树列表宽度
const right_width = 270;//右侧节点模板宽度

export default {
    name: "TreeEditor",
    components: {Draggable, ContextMenu, DebugBar, TreeList, TemplateList, TreeNode, TreeNodeDetail},
    data() {
        return {
            config: null,//编辑器配置
            tree: null,//当前编辑的行为树
            creatingNode: null,//正在新建的节点
            draggingNode: null,
            mouseoverNode: null,
            currentNode: null,//最后选中或者正在运行的节点
            boardX: 0,
            boardY: 0,
            boardWidth: 0,
            boardHeight: 0,
            boardScale: 1,
            leftWidth: left_width,
            rightWidth: right_width,
        }
    },
    async created() {
        try {
            this.config = await ipcRenderer.invoke("load-config");
        } catch (e) {
            this.$logger.error(e)
            this.$msg("加载编辑器配置报错，按F12查看错误详情", "error");
            return;
        }

        ipcRenderer.on("toggle-tree-list", () => {
            this.leftWidth = this.leftWidth === left_width ? 0 : left_width;
            this.resetBoardPosition();
        });

        ipcRenderer.on("toggle-template-list", () => {
            this.rightWidth = this.rightWidth === right_width ? 0 : right_width;
            this.resetBoardPosition();
        });

        ipcRenderer.on("undo", this.undo);
        ipcRenderer.on("redo", this.redo);
        ipcRenderer.on("cut-nodes", () => this.deleteNodes(true));
        ipcRenderer.on("copy-nodes", this.copyNodes);
        ipcRenderer.on("delete-subtrees", this.deleteSubtrees);
        ipcRenderer.on("delete-nodes", this.deleteNodes);
    },
    mounted() {
        this.resizeObserver = new ResizeObserver(this.drawTree);
        this.resizeObserver.observe(this.$refs.center);
    },
    computed: {
        boardStyle() {
            return {
                width: this.boardWidth + 'px',
                height: this.boardHeight + 'px',
                transform: `scale(${this.boardScale},${this.boardScale})`
            };
        },
        visibleNodes() {
            let nodes = [];
            if (!this.tree) {
                return nodes;
            }

            this.$utils.visitSubtree(this.tree.root, node => {
                nodes.push(node);
                return !node.childrenFolded;
            });

            return nodes;
        },
    },
    methods: {
        onSelectedTree(tree) {
            this.tree = tree;
            this.$refs.debugBar.onSelectedTree(tree);
            clipboard.onSelectedTree(tree);
            this.resetBoard();
            this.drawTree();
        },
        async drawTree() {
            const draw = () => {
                let boardParentElement = this.$refs.board.$el.parentElement
                this.boardWidth = boardParentElement.offsetWidth;
                this.boardHeight = boardParentElement.offsetHeight;

                if (!this.tree) {
                    this.initCanvas();
                    return;
                }

                this.$utils.calcNodeBounds(this.tree.root, this.getNodeElement);

                this.boardWidth = Math.max(this.boardWidth, this.tree.root.subtreeWidth + board_edge_space * 2);
                this.boardHeight = Math.max(this.boardHeight, this.tree.root.subtreeHeight + board_edge_space * 2);
                if (this.boardX < (-this.boardWidth + board_edge_space) * this.boardScale
                    || this.boardY < -(this.boardHeight + board_edge_space) * this.boardScale) {
                    this.resetBoardPosition();
                }

                this.$utils.calcNodePositions(this.tree.root, board_edge_space);
                this.drawLinkLines();
            };

            //等待界面刷新后才能获得元素大小
            await this.$nextTick();

            draw();

            //节点有时候会先被撑大再还原导致calcNodeBounds不准确，延时再执行一次
            await this.$nextTick();
            draw();
        },
        getNodeElement(node) {
            //坑，v-for中的ref是个数组
            let nodeRef = this.$refs["node-" + node.id];
            if (Array.isArray(nodeRef)) {
                return nodeRef[0].$el;
            } else if (nodeRef) {
                // noinspection JSUnresolvedFunction
                return nodeRef.$el;
            } else {
                this.$logger.error("nodeRef is null", node.id);
            }
        },
        initCanvas() {
            let canvas = this.$refs.canvas;
            canvas.width = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;
            let context = canvas.getContext("2d");
            context.clearRect(0, 0, canvas.width, canvas.height);
            return context;
        },
        drawLinkLines() {
            let context = this.initCanvas();

            const drawLine = (x1, y1, x2, y2) => {
                let cpx1 = x1 + (x2 - x1) / 2;
                let cpx2 = x2 - (x2 - x1) / 2;
                context.beginPath();
                context.moveTo(x1, y1);
                context.bezierCurveTo(cpx1, y1, cpx2, y2, x2, y2);
                context.stroke();
            };

            const nodeFoldChildrenIconWidth = 14;//节点的收起子树图标宽度

            const lineToChildren = node => {
                if (!node || node.childrenFolded) {
                    return;
                }

                let x1 = node.x + node.selfWidth - this.$utils.nodeSpaceX(node) + nodeFoldChildrenIconWidth;
                let y1 = node.y + (node.selfHeight - this.$utils.nodeSpaceY) / 2;

                for (let child of node.children) {
                    if (!child.replacing) {
                        let x2 = child.x;
                        let y2 = child.y + (child.selfHeight - this.$utils.nodeSpaceY) / 2;
                        if (child.dragging) {
                            context.strokeStyle = "#b32de0"
                        } else {
                            context.strokeStyle = "#5b7af8"
                        }
                        drawLine(x1, y1, x2, y2);
                    }
                    lineToChildren(child);
                }
            };

            lineToChildren(this.tree.root);

            if (this.creatingNode?.parent && !this.creatingNode.replacing) {
                context.strokeStyle = "#b32de0";
                let creatingNodeParent = this.creatingNode.parent;
                let x1 = creatingNodeParent.x + creatingNodeParent.selfWidth - this.$utils.nodeSpaceX(creatingNodeParent);
                if (creatingNodeParent.children.length) {
                    x1 += nodeFoldChildrenIconWidth;
                }
                let y1 = creatingNodeParent.y + (creatingNodeParent.selfHeight - this.$utils.nodeSpaceY) / 2;

                let x2 = this.creatingNode.x - this.$utils.getOffsetX(this.$refs.center, this.$refs.body) - this.boardX + 1;
                let y2 = this.creatingNode.y + (this.creatingNode.selfHeight - this.$utils.nodeSpaceY) * this.boardScale / 2 - this.boardY;
                x2 /= this.boardScale;
                y2 /= this.boardScale;

                drawLine(x1, y1, x2, y2);
            }
        },
        onNodeDragStart(node) {
            this.draggingNode = node;
            this.hideNodeParamDropdown();
        },
        onNodeDragging(event, node) {
            if (!this.isDebugging()) {
                if (node.dragging && event.ctrlKey && this.$utils.canReplaceNode(node, this.mouseoverNode)) {
                    node.replacing = true;
                } else {
                    node.replacing = false;
                    this.linkParentNode(node);
                }
            }

            this.drawLinkLines();
        },
        onNodeDragEnd() {
            this.draggingNode = null;
            this.drawTree();
        },
        setCurrentNode(node) {
            if (node.selected || node.running) {
                this.currentNode = node;
            } else if (this.currentNode === node) {
                this.currentNode = null;
            }
        },
        onCtrlKeyDown() {
            let draggingNode = this.draggingNode || this.creatingNode;
            if (!draggingNode || draggingNode.replacing) {
                return;
            }
            if (this.$utils.canReplaceNode(draggingNode, this.mouseoverNode)) {
                draggingNode.replacing = true;
                this.drawLinkLines();
            }
        },
        onCtrlKeyUp() {
            let draggingNode = this.draggingNode || this.creatingNode;
            if (!draggingNode || !draggingNode.replacing) {
                return;
            }

            draggingNode.replacing = false;
            this.linkParentNode(draggingNode);
            this.drawLinkLines();
        },
        onNodeMouseUp(event, targetNode) {
            let draggingNode = this.draggingNode || this.creatingNode;
            if (!event.ctrlKey || !this.$utils.canReplaceNode(draggingNode, targetNode)) {
                return;
            }

            if (this.creatingNode) {
                this.creatingNode.dragging = false;
                this.creatingNode.creating = false;
                this.creatingNode.z = 1;
                this.creatingNode = null;
            }

            this.$utils.replaceNode(draggingNode, targetNode);

            this.drawTree();
        },
        copySubtrees() {
            clipboard.copySubtrees();
        },
        copyNodes() {
            clipboard.copyNodes();
        },
        pasteNodes(targetNode) {
            if (clipboard.pasteNodes(targetNode)) {
                this.drawTree();
            }
        },
        async deleteSubtrees(cut) {
            if (this.isDebugging()) {
                return;
            }
            let deletedNodeIds = await clipboard.deleteSubtrees(cut);
            if (deletedNodeIds) {
                this.updateNodeParamRefs(deletedNodeIds);
                await this.drawTree();
            }
        },
        deleteNodes(cut) {
            if (this.isDebugging()) {
                return;
            }
            let deletedNodeIds = clipboard.deleteNodes(cut);
            if (deletedNodeIds) {
                this.updateNodeParamRefs(deletedNodeIds);
                this.drawTree();
            }
        },
        updateNodeParamRefs(deletedNodeIds) {
            this.$utils.visitSubtree(this.tree.root, node => {
                let params = node.template.params;
                if (!params) {
                    return;
                }
                for (let param of params) {
                    if (param.options?.refType !== "node") {
                        continue;
                    }
                    //被删除的节点有可能被其他节点参数的选项列表引用
                    if (deletedNodeIds.has(node.params[param.name])) {
                        node.params[param.name] = null;
                    }
                }
            });
        },
        onNodeParamDropdownShow(nodeParamSelect) {
            this.nodeParamSelect = nodeParamSelect;
        },
        hideNodeParamDropdown() {
            this.nodeParamSelect?.handleClose();
            for (let dropdown of document.querySelectorAll(".node-param-select-dropdown").values()) {
                dropdown.style.display = "none";
            }
        },
        showNodeMenu(x, y, items, onHide) {
            this.$refs.nodeMenu.show(x, y, this.$refs.center, items, onHide);
        },
        linkParentNode(node, parentNode) {
            if (node.creating) {
                this.tree.deltaX = this.boardX + this.$utils.getOffsetX(this.$refs.center, this.$refs.body);
                this.tree.deltaY = this.boardY + this.$utils.getOffsetY(this.$refs.center, this.$refs.body);
            }
            this.$utils.linkParentNode(node, parentNode, this.getNodeElement);
            this.tree.deltaX = 0;
            this.tree.deltaY = 0;
        },
        onCenterWheel(event) {
            //滚动鼠标时，移动画板
            this.boardY -= event.deltaY / 2;
            this.boardX -= event.deltaX / 2;

            let center = this.$refs.center;
            let {offsetWidth: boardWidth, offsetHeight: boardHeight} = this.$refs.board.$el;

            this.boardY = Math.max(this.boardY, -boardHeight + board_edge_space);
            this.boardY = Math.min(this.boardY, center.offsetHeight - board_edge_space);
            this.boardX = Math.max(this.boardX, -boardWidth + board_edge_space);
            this.boardX = Math.min(this.boardX, center.offsetWidth - board_edge_space);

            this.hideNodeParamDropdown();
        },
        resetBoard() {
            this.resetBoardPosition();
            this.boardScale = 1;
            if (this.tree) {
                this.tree.scale = 1;
            }
        },
        resetBoardPosition() {
            this.boardX = 0;
            this.boardY = 0;
            this.hideNodeParamDropdown();
        },
        onBoardWheel(event) {
            //按住Ctrl键同时滚动鼠标，缩放画板
            let board = this.$refs.board.$el;
            let offsetX = this.$utils.getOffsetX(event.target, board) + event.offsetX;
            let offsetY = this.$utils.getOffsetY(event.target, board) + event.offsetY;

            let boardScale = this.boardScale + (event.deltaY > 0 ? -0.1 : 0.1);
            boardScale = Math.min(3, Math.max(0.3, boardScale));

            this.boardX -= offsetX * (boardScale - this.boardScale);
            this.boardY -= offsetY * (boardScale - this.boardScale);
            this.boardScale = boardScale;
            if (this.tree) {
                this.tree.scale = boardScale;
            }

            this.hideNodeParamDropdown();
        },
        async onBoardDragEnd(event) {
            this.boardX = event.x;
            this.boardY = event.y;

            //等待boardX、boardY修改生效
            await this.$nextTick();

            let center = this.$refs.center;
            let {offsetWidth: boardWidth, offsetHeight: boardHeight} = this.$refs.board.$el;

            //如果拖出界了就拉回到初始位置
            if (this.boardX < (-boardWidth + board_edge_space) * this.boardScale
                || this.boardX > center.offsetWidth - board_edge_space * this.boardScale
                || this.boardY < (-boardHeight + board_edge_space) * this.boardScale
                || this.boardY > center.offsetHeight - board_edge_space * this.boardScale) {
                this.resetBoardPosition();
            }
        },
        async onBoardMouseUp() {
            if (this.creatingNode == null) {
                return;
            }

            let node = this.creatingNode;
            this.creatingNode = null;

            node.dragging = false;
            node.creating = false;
            node.y = node.y - this.boardY;
            node.z = 1;

            this.linkParentNode(node, node.parent);

            this.$utils.saveTree(this.tree);
            await this.drawTree();
            clipboard.selectNode(node);
        },
        async onSelectTemplate(event) {
            if (this.isDebugging()) {
                return
            }

            if (!this.tree) {
                this.$msg("请先创建行为树", "warning");
                return;
            }

            let template = event.template;

            let node = {
                id: ++this.tree.maxNodeId,
                comment: "",
                tid: template.id,
                template,
                creating: true,
                tree: this.tree
            };

            this.$utils.initNode(node)
            node.x = event.x - this.$utils.getOffsetX(this.$el);
            node.y = event.y - this.$utils.getOffsetY(this.$el);

            if (template.params) {
                for (let param of template.params) {
                    let defaultValue = param.default;
                    if (Array.isArray(defaultValue)) {
                        node.params[param.name] = [...defaultValue];
                    } else {
                        node.params[param.name] = defaultValue;
                    }
                }
            }

            this.creatingNode = node;

            await this.$nextTick();

            let creatingNodeElement = this.getNodeElement(this.creatingNode);
            // noinspection JSUnresolvedVariable
            this.creatingNode.x -= creatingNodeElement.offsetWidth * this.boardScale / 2;
            // noinspection JSUnresolvedVariable
            this.creatingNode.y -= creatingNodeElement.offsetHeight * this.boardScale / 2;
            this.$utils.calcNodeBounds(this.creatingNode, this.getNodeElement);
            this.linkParentNode(this.creatingNode);
            this.drawLinkLines();

            window.addEventListener("mouseup", () => {
                this.creatingNode = null;
                this.drawLinkLines();
            }, {once: true});
        },
        showBoardMenu(event) {
            if (!this.tree) {
                return;
            }

            let items = [];

            if (this.isDebugging()) {
                if (this.tree.breakPointCount > 0) {
                    items.push({label: '删除所有断点', handler: this.$refs.debugBar.removeAllBreakpoint});
                }
                if (this.tree.enabledBreakPointCount > 0) {
                    items.push({label: '禁用所有断点', handler: this.$refs.debugBar.disableAllBreakpoint});
                }
                if (this.tree.breakPointCount - this.tree.enabledBreakPointCount > 0) {
                    items.push({label: '启用所有断点', handler: this.$refs.debugBar.enableAllBreakpoint});
                }
            }

            if (this.tree.childrenFolded) {
                items.push({label: '展开全部子树', handler: this.unfoldAllNodeChildren});
            }

            let showNodeId = this.tree.showNodeId;
            items.push({
                label: showNodeId ? '隐藏节点ID' : '显示节点ID',
                handler: () => this.tree.showNodeId = !showNodeId
            });

            items.push({
                label: '删除行为树',
                disabled: this.isDebugging(),
                handler: () => this.$events.$emit("delete-tree", this.tree)
            });

            this.$refs.boardMenu.show(event.clientX, event.clientY, this.$refs.center, items);
        },
        unfoldAllNodeChildren() {
            this.tree.childrenFolded = false;
            this.$utils.visitSubtree(this.tree.root, node => {
                node.childrenFolded = false
            });
            this.$utils.saveTree(this.tree);
            this.drawTree();
        },
        redo() {
            if (this.isDebugging()) {
                return;
            }
            if (this.draggingNode || this.creatingNode) {
                return;
            }
            clipboard.redo();
            this.drawTree();
        },
        undo() {
            if (this.isDebugging()) {
                return;
            }
            if (this.draggingNode || this.creatingNode) {
                return;
            }
            clipboard.undo();
            this.drawTree();
        },
        isDebugging() {
            return this.$refs.debugBar.isDebugging();
        },
    }
}
</script>

<style scoped>
.tree-editor {
    position: absolute;
    width: 100%;
    height: 100%;
    overflow: hidden;
    box-sizing: border-box;
    border: solid #ebeef5 1px;
}

.left, .center, .right {
    position: absolute;
    height: 100%;
    background-color: white;
    box-sizing: border-box;
}

.left {
    border-right: solid #ebeef5 1px;
}

.center {
    overflow: hidden;
}

.center:focus {
    outline: none;
}

.right {
    right: 0;
    border-left: solid #ebeef5 1px;

}

.board {
    width: 100%;
    height: 100%;
    overflow: hidden;
    background-color: aliceblue;
    transform-origin: 0 0;
}

canvas {
    position: absolute;
    width: 100%;
    height: 100%;
    z-index: 10;
    pointer-events: none;
}

</style>