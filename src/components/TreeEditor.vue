<template>
    <div id="body" ref="body" v-loading.fullscreen="config===null">
        <div id="left" :style="{width:leftWidth+'px'}">
            <tree-list v-if="config"
                       ref="treeList"
                       :archetypes="config.archetypes"
                       @select-tree="onSelectTree"/>
        </div>
        <div id="center" :style="{left:leftWidth+'px',right:rightWidth+'px'}">
            <draggable id="board"
                       :freeze="boardFreeze"
                       :x="boardX"
                       :y="boardY"
                       @drag-end="onBoardDragEnd"
                       @dblclick.native="resetBoardPosition"
                       @contextmenu.native="onBoardContextMenu"
                       @mouseup.native="onBoardMouseUp">
                <canvas id="canvas" @contextmenu.prevent/>
                <tree-node v-for="node in visibleNodes"
                           :key="node.id"
                           :ref="'node-'+node.id"
                           :node="node"
                           @drag-start="boardFreeze=true"
                           @dragging="onNodeDragging"
                           @drag-end="onNodeDragEnd"
                           @fold="onNodeFold"
                           @children-fold="onNodeChildrenFold"
                           @delete="drawTree"/>
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
                   @dragging="onNodeDragging"
                   @drag-end="onNodeDragEnd"/>
        <context-menu ref="menu" :items="menuItems"/>
    </div>
</template>

<script>
import Draggable from "./Draggable";
import TreeList from "./TreeList";
import TreeNode from "./TreeNode";
import TemplateList from "./TemplateList";
import ContextMenu from "./ContextMenu";

import utils from "../utils";
import {ipcRenderer} from 'electron'

const nodeSpaceX = 50;//节点x轴间隔空间
const nodeSpaceY = 30;//节点y轴间隔空间
const boardEdgeSpace = 100;//画板边缘空间

const leftWidth = 220;
const rightWidth = 250;

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
            leftWidth,
            rightWidth
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

        ipcRenderer.on("leftVisible", () => {
            this.leftWidth = this.leftWidth === leftWidth ? 0 : leftWidth;
            this.resetBoardPosition();
        });
        ipcRenderer.on("rightVisible", () => {
            this.rightWidth = this.rightWidth === rightWidth ?0 : rightWidth;
            this.resetBoardPosition();
        });
    },
    mounted() {
        this.resizeObserver = new ResizeObserver(this.drawTree);
        this.resizeObserver.observe(document.querySelector("#center"));
    },
    destroyed() {
        this.resizeObserver.disconnect();
    },
    computed: {
        menuItems() {
            let items = [];
            if (!this.tree) {
                return items;
            }
            if ((this.tree.folded & 1) === 1) {//至少有一个节点时收起的
                items.push({title: '展开全部节点', handler: () => this.foldAllNode(false)});
            }
            if ((this.tree.folded & 2) === 2) {//至少有一个节点时展开的
                items.push({title: '收起全部节点', handler: () => this.foldAllNode(true)});
            }
            if (this.tree.childrenFolded) {
                items.push({title: '展开全部子树', handler: this.unfoldAllNodeChildren});
            }
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

            utils.visitNodes(this.tree.root, node => {
                nodes.push(node);
                return !node.childrenFolded;
            });

            //数据变化时自动保存
            utils.saveTree(this.tree);

            return nodes;
        }
    },
    methods: {
        onSelectTree(tree) {
            this.tree = tree;
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
                board.style.width = Math.max(board.parentElement.offsetWidth, this.tree.root.treeWidth + boardEdgeSpace * 2) + "px";
                board.style.height = Math.max(board.parentElement.offsetHeight, this.tree.root.treeHeight + boardEdgeSpace * 2) + "px";

                this.calcNodePosition(this.tree.root, boardEdgeSpace);
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
            let nodeContent;
            if (node === this.creatingNode) {
                // noinspection JSUnresolvedFunction
                nodeContent = this.$refs["node-" + node.id].content();
            } else {
                nodeContent = this.$refs["node-" + node.id][0].content();
            }

            //界面渲染完成之后才能取到元素大小
            node.selfWidth = nodeContent.offsetWidth + nodeSpaceX;
            node.selfHeight = nodeContent.offsetHeight + nodeSpaceY;

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
                node.x = boardEdgeSpace;
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

                let x1 = node.x + node.selfWidth - nodeSpaceX + nodeFoldChildrenIconWidth;
                let y1 = node.y + (node.selfHeight - nodeSpaceY) / 2;

                for (let child of node.children) {
                    let x2 = child.x;
                    let y2 = child.y + (child.selfHeight - nodeSpaceY) / 2;
                    if (child.dragging) {
                        context.strokeStyle = "red"
                    } else {
                        context.strokeStyle = "#274ff6"
                    }
                    drawLine(x1, y1, x2, y2);
                    lineToChildren(child);
                }
            };

            lineToChildren(this.tree.root);

            if (this.creatingNode && this.creatingNode.parent) {
                context.strokeStyle = "red";
                let creatingNodeParent = this.creatingNode.parent;
                let x1 = creatingNodeParent.x + creatingNodeParent.selfWidth - nodeSpaceX;
                if (creatingNodeParent.children && creatingNodeParent.children.length) {
                    x1 += nodeFoldChildrenIconWidth;
                }
                let y1 = creatingNodeParent.y + (creatingNodeParent.selfHeight - nodeSpaceY) / 2;
                let x2 = this.creatingNode.x - document.querySelector("#left").offsetWidth - this.boardX;
                let y2 = this.creatingNode.y + (this.creatingNode.selfHeight - nodeSpaceY) / 2 - this.boardY;
                drawLine(x1, y1, x2, y2);
            }
        },
        onNodeDragging(node) {
            this.linkParentNode(node);
            this.drawLinkLines();
        },
        onNodeDragEnd() {
            this.boardFreeze = false;
            this.drawTree();
        },
        onNodeFold() {
            this.tree.folded = 0;
            utils.visitNodes(this.tree.root, node => {
                this.tree.folded |= node.folded ? 1 : 2;
                return !node.childrenFolded;
            });
            this.drawTree();
        },
        onNodeChildrenFold(node) {
            this.tree.childrenFolded = this.tree.childrenFolded || node.childrenFolded;
            this.drawTree();
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
        findParentNode(node) {
            let deltaX = 0;
            let deltaY = 0;
            if (node === this.creatingNode) {
                deltaX = document.querySelector("#left").offsetWidth + this.boardX;
                deltaY = this.boardY;
            }

            let x1 = node.x;
            let y1 = node.y + (node.selfHeight - nodeSpaceY) / 2;

            //寻找最近的的节点作为父节点
            let parentNode = null;
            let minDistance2 = -1;

            utils.visitNodes(this.tree.root, targetNode => {
                if (!targetNode || targetNode === node || targetNode.collapsed) {
                    return false;
                }

                let canLink = true;

                //目标节点限制子节点类型
                let targetNodeType = targetNode.template.type;
                if (targetNodeType.childrenTypes.indexOf(node.template.type.id) < 0) {
                    canLink = false;
                }
                //目标节点限制子节点数量
                let childrenNum = targetNode.template.childrenNum || targetNodeType.childrenNum;
                if (childrenNum >= 0
                        && targetNode.children.length >= childrenNum
                        && targetNode.children.indexOf(node) < 0) {
                    canLink = false;
                }

                if (canLink) {
                    let x2 = deltaX + targetNode.x + targetNode.selfWidth - nodeSpaceX;
                    let y2 = deltaY + targetNode.y + (targetNode.selfHeight - nodeSpaceY) / 2;

                    let distance2 = (x1 - x2) ** 2 + (y1 - y2) ** 2;
                    if (minDistance2 < 0 || distance2 < minDistance2) {
                        minDistance2 = distance2;
                        parentNode = targetNode;
                    }
                }
            });

            return parentNode;
        },
        resetBoardPosition() {
            this.boardX = 0;
            this.boardY = 0;
        },
        async onBoardDragEnd(event) {
            this.boardX = event.x;
            this.boardY = event.y;

            //等待boardX、boardY修改生效
            await this.$nextTick();

            //如果拖出界了就拉回到初始位置
            let board = document.querySelector("#board");
            let center = document.querySelector("#center");
            if (event.x < -board.offsetWidth + boardEdgeSpace || event.x > center.offsetWidth - boardEdgeSpace) {
                this.resetBoardPosition();
            }
            if (event.y < -board.offsetHeight + boardEdgeSpace || event.y > center.offsetHeight - boardEdgeSpace) {
                this.resetBoardPosition();
            }
        },
        async onBoardMouseUp() {
            if (this.creatingNode == null) {
                return;
            }

            let creatingNode = this.creatingNode;
            this.creatingNode = null;
            creatingNode.dragging = false;
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
                name: "",
                tid: template.id,
                template: template,
                x: event.x - utils.getClientX(this.$refs.body),
                y: event.y - utils.getClientY(this.$refs.body),
                z: 1,
                folded: true,
                params: {},
                children: [],
                childrenFolded: false
            };

            if (template.params) {
                for (let paramName of Object.keys(template.params)) {
                    node.params[paramName] = template.params[paramName].value;
                }
            }

            this.creatingNode = node;

            await this.$nextTick();

            // noinspection JSUnresolvedFunction
            let creatingNodeContent = this.$refs["node-" + this.creatingNode.id].content();
            this.creatingNode.x -= creatingNodeContent.offsetWidth / 2;
            this.creatingNode.y -= creatingNodeContent.offsetHeight / 2;
            this.calcNodeBounds(this.creatingNode);
            this.linkParentNode(this.creatingNode);
            this.drawLinkLines();

            window.addEventListener("mouseup", () => {
                this.creatingNode = null;
                this.drawLinkLines();
            }, {once: true});
        },
        onBoardContextMenu(event) {
            let center = document.querySelector("#center");
            let limits = {
                x: utils.getClientX(center),
                y: utils.getClientY(center),
                width: center.offsetWidth,
                height: center.offsetHeight,
            };
            this.$refs.menu.show(event.clientX, event.clientY, limits);
        },
        foldAllNode(folded) {
            this.tree.folded = folded ? 1 : 2;
            utils.visitNodes(this.tree.root, node => {
                node.folded = folded;
            });
            this.drawTree();
        },
        unfoldAllNodeChildren() {
            this.tree.childrenFolded = false;
            utils.visitNodes(this.tree.root, node => {
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

#left {
    position: absolute;
    height: 100%;
}

#right {
    position: absolute;
    height: 100%;
    right: 0;
    user-select: none;
}

#center {
    position: absolute;
    height: 100%;
    box-sizing: border-box;
    overflow: hidden;
    border-top: solid 1px #dcdfe6;
}

#board {
    width: 100%;
    height: 100%;
    overflow: hidden;
    background-color: aliceblue;

}

#canvas {
    position: absolute;
    width: 100%;
    height: 100%;
    z-index: 20;
    pointer-events: none;
}

</style>