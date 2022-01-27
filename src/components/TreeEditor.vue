<template>
    <div id="body" ref="body" v-loading.fullscreen="config===null">
        <div id="left" :style="{width:leftWidth+'px'}">
            <tree-list v-if="config"
                       ref="treeList"
                       :archetypes="config.archetypes"
                       @select-tree="onSelectTree"/>
        </div>
        <div id="center"
             @dblclick="resetBoard"
             @wheel.exact="onCenterWheel"
             :style="{left:(leftWidth+2)+'px',right:rightWidth+'px'}">
            <draggable id="board"
                       :freeze="boardFreeze"
                       :x="boardX"
                       :y="boardY"
                       @drag-start="onBoardDragStart"
                       @drag-end="onBoardDragEnd"
                       @contextmenu.native="showBoardMenu"
                       @mouseup.native="onBoardMouseUp"
                       @wheel.ctrl.exact.native="scaleBoard"
                       :style="{width:boardWidth+'px',height:boardHeight+'px',transform:`scale(${boardScale},${boardScale})`}">
                <canvas id="canvas" @contextmenu.prevent/>
                <tree-node v-for="node in visibleNodes"
                           :node="node"
                           :key="tree.id+'-'+node.id"
                           :ref="'node-'+node.id"
                           @drag-start="onNodeDragStart"
                           @dragging="onNodeDragging"
                           @drag-end="onNodeDragEnd"
                           @menu="showNodeMenu"
                           @remove="drawTree"
                           @paste="onNodePaste(node)"
                           @resize="drawTree"
                           @fold="onNodeFold"
                           @children-fold="onNodeChildrenFold"
                           @param-select-show="onParamSelectShow"/>
            </draggable>
        </div>
        <div id="right" :style="{width:rightWidth+'px'}">
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
                   :creating="true"
                   style="pointer-events:none"
                   @dragging="onNodeDragging"
                   @drag-end="onNodeDragEnd"/>
        <context-menu ref="boardMenu" :items="boardMenuItems"/>
        <context-menu ref="nodeMenu"/>
    </div>
</template>

<script>
import Draggable from "./Draggable";
import TreeList from "./TreeList";
import TreeNode from "./TreeNode";
import TemplateList from "./TemplateList";
import ContextMenu from "./ContextMenu";

import {ipcRenderer} from 'electron'

//节点x轴间隔空间
function nodeSpaceX(node) {
    if (node.children.length <= 3) {
        return 30;
    } else if (node.children.length <= 8) {
        return 50;
    } else {
        return 70;
    }
}

const node_space_y = 20;//节点y轴间隔空间
const board_edge_space = 100;//画板边缘空间

const left_width = 220;
const right_width = 250;

export default {
    name: "TreeEditor",
    components: {Draggable, TreeNode, TreeList, TemplateList, ContextMenu},
    data() {
        return {
            config: null,//编辑器配置
            tree: null,//当前编辑的行为树
            creatingNode: null,//正在新建的节点
            boardFreeze: false,
            boardX: 0,
            boardY: 0,
            boardWidth: 0,
            boardHeight: 0,
            boardScale: 1,
            leftWidth: left_width,
            rightWidth: right_width
        }
    },
    async created() {
        try {
            this.config = await ipcRenderer.invoke("load-config");
        } catch (e) {
            console.error(e);
            this.$message.error({message: "加载编辑器配置报错，按F12查看错误详情", center: true, offset: 200});
            return;
        }

        ipcRenderer.on("left-visible", () => {
            this.leftWidth = this.leftWidth === left_width ? 0 : left_width;
            this.resetBoardPosition();
        });
        ipcRenderer.on("right-visible", () => {
            this.rightWidth = this.rightWidth === right_width ? 0 : right_width;
            this.resetBoardPosition();
        });
        ipcRenderer.on("fold-all-node", (e, fold) => this.foldAllNode(fold));
    },
    mounted() {
        this.resizeObserver = new ResizeObserver(this.drawTree);
        this.resizeObserver.observe(document.querySelector("#center"));
    },
    destroyed() {
        this.resizeObserver.disconnect();
    },
    computed: {
        boardMenuItems() {
            let items = [];
            if (!this.tree) {
                return items;
            }
            if ((this.tree.folded & 1) === 1) {//至少有一个节点是收起的
                items.push({title: '展开全部节点', handler: () => this.foldAllNode(false)});
            }
            if ((this.tree.folded & 2) === 2) {//至少有一个节点是展开的
                items.push({title: '收起全部节点', handler: () => this.foldAllNode(true)});
            }
            if (this.tree.childrenFolded) {
                items.push({title: '展开全部子树', handler: this.unfoldAllNodeChildren});
            }
            let nodeIdShown = this.tree.nodeIdShown;
            items.push({title: (nodeIdShown ? '隐藏' : '显示') + '节点ID', handler: () => this.tree.nodeIdShown = !nodeIdShown});
            items.push({
                title: '删除行为树', handler: () => {
                    this.$events.$emit("delete-tree", this.tree);
                }
            });
            return items;
        },
        visibleNodes() {
            let nodes = [];
            if (!this.tree) {
                return nodes;
            }

            this.$utils.visitNodes(this.tree.root, node => {
                nodes.push(node);
                return !node.childrenFolded;
            });

            //数据变化时自动保存
            this.$utils.saveTree(this.tree);

            return nodes;
        }
    },
    methods: {
        onSelectTree(tree) {
            this.tree = tree;
            this.resetBoard();
            this.drawTree();
        },
        async drawTree() {
            //等待界面刷新后才能获得元素大小
            await this.$nextTick();

            const draw = () => {
                if (!this.tree) {
                    this.initCanvas();
                    return;
                }

                this.calcNodeBounds(this.tree.root);

                const board = document.querySelector("#board");
                this.boardWidth = Math.max(board.parentElement.offsetWidth, this.tree.root.treeWidth + board_edge_space * 2);
                this.boardHeight = Math.max(board.parentElement.offsetHeight, this.tree.root.treeHeight + board_edge_space * 2);
                if (this.boardX < (-this.boardWidth + board_edge_space) * this.boardScale
                        || this.boardY < -(this.boardHeight + board_edge_space) * this.boardScale) {
                    this.resetBoardPosition();
                }

                this.calcNodePosition(this.tree.root, board_edge_space);
                this.drawLinkLines();
            };

            draw();

            //节点有时候会先被撑大再还原导致calcNodeBounds不准确，延时再执行一次
            await this.$nextTick();
            draw();
        },
        calcNodeBounds(node) {
            if (!node) {
                return;
            }

            //坑，v-for中的ref是个数组
            let nodeElement;
            let nodeRef = this.$refs["node-" + node.id];
            if (Array.isArray(nodeRef)) {
                nodeElement = nodeRef[0].$el;
            } else {
                // noinspection JSUnresolvedFunction
                nodeElement = nodeRef.$el;
            }

            //界面渲染完成之后才能取到元素大小
            node.selfWidth = nodeElement.offsetWidth + nodeSpaceX(node);
            node.selfHeight = nodeElement.offsetHeight + node_space_y;

            if (!node.children.length || node.childrenFolded) {
                node.treeWidth = node.selfWidth;
                node.treeHeight = node.selfHeight;
                return;
            }

            let maxChildWidth = 0;
            let childrenHeight = 0;

            for (let child of node.children) {
                this.calcNodeBounds(child);
                if (child.treeWidth > maxChildWidth) {
                    maxChildWidth = child.treeWidth;
                }
                childrenHeight += child.treeHeight;
            }

            node.treeWidth = node.selfWidth + maxChildWidth;
            node.treeHeight = Math.max(node.selfHeight, childrenHeight);
            node.childrenHeight = childrenHeight;
        },
        calcNodePosition(node, lastY) {
            if (!node) {
                return;
            }
            if (node.parent) {
                node.x = node.parent.x + node.parent.selfWidth;
            } else {
                node.x = board_edge_space;
            }

            if (!node.children.length || node.childrenFolded) {
                node.y = lastY;
                return;
            }

            if (node.treeHeight <= node.childrenHeight) {
                for (let child of node.children) {
                    this.calcNodePosition(child, lastY);
                    lastY += child.treeHeight;
                }
                if (node.children.length > 1) {
                    let lastChild = node.children[node.children.length - 1];
                    node.y = (node.children[0].y + lastChild.y + lastChild.selfHeight - node.selfHeight) / 2;
                } else {
                    node.y = node.children[0].y + node.children[0].selfHeight / 2 - node.selfHeight / 2;
                }
            } else {
                // 父节点比所有子树高度之和还高
                node.y = lastY;
                lastY += (node.selfHeight - node.childrenHeight) / 2;
                for (let child of node.children) {
                    this.calcNodePosition(child, lastY);
                    lastY += child.treeHeight;
                }
            }
        },
        initCanvas() {
            let canvas = document.querySelector("#canvas");
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

            const nodeFoldChildrenIconWidth = 14;//节点收起子树图标宽度

            const lineToChildren = node => {
                if (!node || node.childrenFolded) {
                    return;
                }

                let x1 = node.x + node.selfWidth - nodeSpaceX(node) + nodeFoldChildrenIconWidth;
                let y1 = node.y + (node.selfHeight - node_space_y) / 2;

                for (let child of node.children) {
                    let x2 = child.x;
                    let y2 = child.y + (child.selfHeight - node_space_y) / 2;
                    if (child.dragging) {
                        context.strokeStyle = "#b32de0"
                    } else {
                        context.strokeStyle = "#5b7af8"
                    }
                    drawLine(x1, y1, x2, y2);
                    lineToChildren(child);
                }
            };

            lineToChildren(this.tree.root);

            if (this.creatingNode && this.creatingNode.parent) {
                context.strokeStyle = "#b32de0";
                let creatingNodeParent = this.creatingNode.parent;
                let x1 = creatingNodeParent.x + creatingNodeParent.selfWidth - nodeSpaceX(creatingNodeParent);
                if (creatingNodeParent.children && creatingNodeParent.children.length) {
                    x1 += nodeFoldChildrenIconWidth;
                }
                let y1 = creatingNodeParent.y + (creatingNodeParent.selfHeight - node_space_y) / 2;
                let x2 = this.creatingNode.x - document.querySelector("#left").offsetWidth - this.boardX;
                let y2 = this.creatingNode.y + (this.creatingNode.selfHeight - node_space_y) / 2 - this.boardY;
                x2 /= this.boardScale;
                y2 /= this.boardScale;
                drawLine(x1, y1, x2, y2);
            }
        },
        onNodeDragStart() {
            this.boardFreeze = true;
            this.hideNodeParamDropdown();
        },
        onNodeDragging(node) {
            this.linkParentNode(node);
            this.drawLinkLines();
        },
        onNodeDragEnd() {
            this.boardFreeze = false;
            this.drawTree();
        },
        onNodePaste(targetNode) {
            if (!this.$store.node) {
                return;
            }

            let pasteNode = JSON.parse(JSON.stringify(this.$store.node));

            if (!this.nodeCanLink(pasteNode, targetNode)) {
                return;
            }

            this.$utils.visitNodes(pasteNode, (node, parent) => {
                node.id = ++this.tree.maxNodeId;
                this.$utils.initNode(this.tree, node, parent);
            });

            if (targetNode.children.length) {
                pasteNode.y = targetNode.children[targetNode.children.length - 1].y + 1;
            }
            this.linkParentNode(pasteNode, targetNode);

            this.drawTree();
        },
        onParamSelectShow(selectRef) {
            this.selectRef = selectRef;
        },
        hideNodeParamDropdown() {
            this.selectRef?.handleClose();
            for (let dropdown of document.querySelectorAll(".node-param-select-dropdown").values()) {
                dropdown.style.display = "none";
            }
        },
        onNodeFold() {
            this.tree.folded = 0;
            this.$utils.visitNodes(this.tree.root, node => {
                if (node.template.comment || Object.keys(node.params).length > 0) {
                    this.tree.folded |= node.folded ? 1 : 2;
                }
                return !node.childrenFolded;
            });
            this.drawTree();
        },
        onNodeChildrenFold(node) {
            this.tree.childrenFolded = this.tree.childrenFolded || node.childrenFolded;
            this.drawTree();
        },
        showNodeMenu(x, y, items) {
            let center = document.querySelector("#center");
            this.$refs.nodeMenu.show(x, y, center, items);
        },
        linkParentNode(node, parentNode) {
            if (parentNode == null) {
                parentNode = this.findParentNode(node);
            }

            if (parentNode == null) {
                return;
            }

            if (node === this.creatingNode) {
                node.parent = parentNode;
                return;
            }

            //关联父子节点
            if (node.parent && node.parent.children) {
                let nodeIndex = node.parent.children.indexOf(node);
                if (nodeIndex >= 0) {
                    node.parent.children.splice(nodeIndex, 1);
                }
            }
            node.parent = parentNode;
            parentNode.children.push(node);

            //按y轴排序兄弟节点
            parentNode.children.sort((n1, n2) => n1.y - n2.y);
        },
        nodeCanLink(node, targetNode) {
            if (!targetNode || targetNode === node || targetNode.childrenFolded) {
                return false;
            }

            //目标节点限制子节点模板类型或者模板ID
            if (node.template.type && targetNode.template.childrenTypes.indexOf(node.template.type.id) < 0 &&
                    (!targetNode.template.childrenIds || targetNode.template.childrenIds.indexOf(node.template.id) < 0)) {
                return false;
            }
            //目标节点限制子节点数量
            return !(targetNode.children.indexOf(node) < 0
                    && targetNode.template.childrenNum >= 0
                    && targetNode.children.length >= targetNode.template.childrenNum);
        },
        findParentNode(node) {
            let deltaX = 0;
            let deltaY = 0;
            if (node === this.creatingNode) {
                deltaX = document.querySelector("#left").offsetWidth + this.boardX;
                deltaY = this.boardY;
            }

            let x1 = node.x;
            let y1 = node.y + (node.selfHeight - node_space_y) / 2;

            //寻找最近的的节点作为父节点
            let parentNode = null;
            let minDistance2 = -1;

            this.$utils.visitNodes(this.tree.root, targetNode => {
                if (!targetNode || targetNode === node || targetNode.childrenFolded) {
                    return false;
                }

                if (this.nodeCanLink(node, targetNode)) {
                    let x2 = deltaX + targetNode.x + targetNode.selfWidth - nodeSpaceX(targetNode);
                    let y2 = deltaY + targetNode.y + (targetNode.selfHeight - node_space_y) / 2;

                    let distance2 = (x1 - x2) ** 2 + (y1 - y2) ** 2;
                    if (!parentNode || x1 > x2 && distance2 < minDistance2) {
                        minDistance2 = distance2;
                        parentNode = targetNode;
                    }
                }
            });

            return parentNode;
        },
        resetBoard() {
            this.resetBoardPosition();
            this.boardScale = 1;
            this.tree.scale = 1;
        },
        resetBoardPosition() {
            this.boardX = 0;
            this.boardY = 0;
            this.hideNodeParamDropdown();
        },
        scaleBoard(event) {
            let board = document.querySelector("#board");
            let offsetX = this.$utils.getOffsetX(event.target, board) + event.offsetX;
            let offsetY = this.$utils.getOffsetY(event.target, board) + event.offsetY;

            let boardScale = this.boardScale + (event.deltaY > 0 ? -0.1 : 0.1);
            boardScale = Math.min(3, Math.max(0.3, boardScale));

            this.boardX -= offsetX * (boardScale - this.boardScale);
            this.boardY -= offsetY * (boardScale - this.boardScale);
            this.boardScale = boardScale;
            this.tree.scale = boardScale;
        },
        onBoardDragStart() {
            this.hideNodeParamDropdown();
        },
        async onBoardDragEnd(event) {
            this.boardX = event.x;
            this.boardY = event.y;

            //等待boardX、boardY修改生效
            await this.$nextTick();

            //如果拖出界了就拉回到初始位置
            let board = document.querySelector("#board");
            let center = document.querySelector("#center");

            if (this.boardX < (-board.offsetWidth + board_edge_space) * this.boardScale
                    || this.boardX > center.offsetWidth - board_edge_space * this.boardScale
                    || this.boardY < (-board.offsetHeight + board_edge_space) * this.boardScale
                    || this.boardY > center.offsetHeight - board_edge_space * this.boardScale) {
                this.resetBoardPosition();
            }
        },
        onCenterWheel(event) {
            this.boardY -= event.deltaY / 2;
            this.boardX -= event.deltaX / 2;
            let board = document.querySelector("#board");
            let center = document.querySelector("#center");
            this.boardY = Math.max(this.boardY, -board.offsetHeight + board_edge_space);
            this.boardY = Math.min(this.boardY, center.offsetHeight - board_edge_space);
            this.boardX = Math.max(this.boardX, -board.offsetWidth + board_edge_space);
            this.boardX = Math.min(this.boardX, center.offsetWidth - board_edge_space);
        },
        async onBoardMouseUp() {
            if (this.creatingNode == null) {
                return;
            }

            let creatingNode = this.creatingNode;
            this.creatingNode = null;

            creatingNode.tree = this.tree;
            creatingNode.dragging = false;

            creatingNode.y = creatingNode.y - this.boardY;
            creatingNode.z = 1;

            this.linkParentNode(creatingNode, creatingNode.parent);

            await this.drawTree();
        },
        async onSelectTemplate(event) {
            if (!this.tree) {
                return;
            }

            let template = event.template;

            let node = {
                id: ++this.tree.maxNodeId,
                comment: "",
                tid: template.id,
                template,
                x: event.x - this.$utils.getOffsetX(this.$refs.body),
                y: event.y - this.$utils.getOffsetY(this.$refs.body),
                z: 1,
                folded: true,
                params: {},
                children: [],
                childrenFolded: false
            };

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

            let creatingNodeElement = this.$refs["node-" + this.creatingNode.id].$el;
            // noinspection JSUnresolvedVariable
            this.creatingNode.x -= creatingNodeElement.offsetWidth / 2;
            // noinspection JSUnresolvedVariable
            this.creatingNode.y -= creatingNodeElement.offsetHeight / 2;
            this.calcNodeBounds(this.creatingNode);
            this.linkParentNode(this.creatingNode);
            this.drawLinkLines();

            window.addEventListener("mouseup", () => {
                this.creatingNode = null;
                this.drawLinkLines();
            }, {once: true});
        },
        showBoardMenu(event) {
            let center = document.querySelector("#center");
            this.$refs.boardMenu.show(event.clientX, event.clientY, center);
        },
        foldAllNode(fold) {
            if (!this.tree) {
                return;
            }

            this.tree.folded = fold ? 1 : 2;
            this.$utils.visitNodes(this.tree.root, node => {
                node.folded = fold;
            });

            this.hideNodeParamDropdown();
            this.drawTree();
        },
        unfoldAllNodeChildren() {
            this.tree.childrenFolded = false;
            this.$utils.visitNodes(this.tree.root, node => {
                node.childrenFolded = false
            });
            this.drawTree();
        }
    }
}
</script>

<style scoped>
#body {
    position: absolute;
    width: 100%;
    height: 100%;
    overflow: hidden;
}

#left, #center, #right {
    position: absolute;
    height: 100%;
    background-color: white;
    box-sizing: border-box;
}

#center {
    overflow: hidden;
    border-top: solid 1px #ebeef5;
}

#right {
    right: 0;
    user-select: none;
}

#board {
    width: 100%;
    height: 100%;
    overflow: hidden;
    background-color: aliceblue;
    transform-origin: 0 0;
}

#canvas {
    position: absolute;
    width: 100%;
    height: 100%;
    z-index: 20;
    pointer-events: none;
}

</style>