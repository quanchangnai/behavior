import Vue from "vue";
import utils from "./utils";

/**
 * 行为树剪切板，复制行为树复制、粘贴、删除相关功能
 */
export default {
    /**
     * 当前行为树
     */
    tree: null,
    /**
     * 选中的节点
     */
    selectedNodes: new Set(),
    /**
     * 复制的节点
     */
    copiedNodes: [],
    setTree(tree) {
        this.tree = tree;
        this.selectedNodes.clear()
    },
    copySubtrees() {
        if (this.selectedNodes.size < 1) {
            return;
        }

        this.copiedNodes = [];

        //节点的任意后代节点是否有被选中
        let descendantsSelectedMap = new Map();
        let checkDescendantsSelected = node => {
            let descendantSelected = false;
            for (let child of node.children) {
                descendantSelected |= checkDescendantsSelected(child)
            }
            descendantsSelectedMap.set(node, descendantSelected);
            return this.selectedNodes.has(node) || descendantSelected;
        };
        checkDescendantsSelected(this.tree.root);

        let resolveChildren = node => {
            let selectedChildren = node.children.filter(child => this.selectedNodes.has(child));
            if (selectedChildren.length === 0 && !descendantsSelectedMap.get(node)) {
                return node.children;
            } else {
                return selectedChildren;
            }
        };

        for (let selectedNode of this.selectedNodes) {
            if (!this.selectedNodes.has(selectedNode.parent)) {
                let copiedNode = utils.buildSubtree(selectedNode, resolveChildren);
                this.copiedNodes.push(copiedNode);
                utils.events.$emit("init-tree", copiedNode);
            }
        }
    },
    copyNodes() {
        if (this.selectedNodes.size < 1) {
            return;
        }

        this.copiedNodes = [];
        for (let selectedNode of this.selectedNodes) {
            let copiedNode = utils.buildNode(selectedNode);
            this.copiedNodes.push(copiedNode);
            utils.events.$emit("init-tree", copiedNode);
        }
    },
    pasteNodes(targetNode) {
        if (!this.copiedNodes.length) {
            return false;
        }

        let pastedCount = 0;
        for (let copiedNode of this.copiedNodes) {
            let pasteNode = JSON.parse(JSON.stringify(copiedNode));
            if (!utils.canLinkNode(pasteNode, targetNode)) {
                continue;
            }
            utils.visitSubtree(pasteNode, (node, parent) => {
                node.id = ++this.tree.maxNodeId;
                utils.initNode(node, parent, this.tree);
            });

            if (targetNode.children.length) {
                pasteNode.y = targetNode.children[targetNode.children.length - 1].y + 1;
            }
            utils.linkParentNode(pasteNode, targetNode);
            pastedCount++;
        }

        if (pastedCount !== this.copiedNodes.length) {
            utils.msg("部分复制的节点不能粘贴到目标节点", "warning");
        }

        return pastedCount > 0;
    },
    async deleteSubtrees() {
        let selectedNodes = [...this.selectedNodes];
        if (selectedNodes.size < 1) {
            return;
        }

        let allAreLeaves = true;
        let deletedNodeIds = new Set();

        for (let selectedNode of selectedNodes) {
            allAreLeaves &= selectedNode.children.length === 0;
            if (selectedNode.parent) {
                utils.visitSubtree(selectedNode, node => deletedNodeIds.add(node.id));
            }
        }

        if (deletedNodeIds.size < 1) {
            utils.msg("不能删除选择的" + (allAreLeaves ? "节点" : "子树"), "warning");
            return;
        }

        try {
            if (!allAreLeaves) {
                await Vue.prototype.$confirm("确定删除选择的节点及其所有子孙节点？", {type: "warning"});
            }
        } catch {
            return;
        }

        for (let selectedNode of selectedNodes) {
            if (selectedNode.parent) {
                let index = selectedNode.parent.children.indexOf(selectedNode);
                selectedNode.parent.children.splice(index, 1);
            }
        }

        return deletedNodeIds;
    },
    deleteNodes() {
        let selectedNodes = this.selectedNodes;
        if (selectedNodes.size < 1) {
            return;
        }

        let deleteNodeChildrenMap = new Map();
        let pushSelectedChildren = (node, children) => {
            for (let child of node.children) {
                if (this.selectedNodes.has(child)) {
                    pushSelectedChildren(child, children);
                } else {
                    children.push(child);
                }
            }
        };

        for (let selectedNode of selectedNodes) {
            if (!selectedNode.parent) {
                continue;
            }

            let selectedChildren = [];
            pushSelectedChildren(selectedNode, selectedChildren);
            deleteNodeChildrenMap.set(selectedNode, selectedChildren);
            let selectedParentChildrenNum = selectedNode.parent.children.length - 1;

            for (let selectedChild of selectedChildren) {
                if (utils.canLinkNode(selectedChild, selectedNode.parent, selectedParentChildrenNum)) {
                    selectedParentChildrenNum++;
                } else {
                    deleteNodeChildrenMap.delete(selectedNode);
                    break;
                }
            }
        }

        if (deleteNodeChildrenMap.size < 1) {
            utils.msg("不能删除选择的节点", "warning");
            return;
        }

        let deletedNodeIds = new Set();
        utils.visitSubtree(this.tree.root, node => {
            if (!node.parent) {
                return;
            }
            if (deletedNodeIds.has(node.parent.id)) {
                deletedNodeIds.add(node);
                return;
            }
            let nodeChildren = deleteNodeChildrenMap.get(node);
            if (nodeChildren) {
                deletedNodeIds.add(node);
                let index = node.parent.children.indexOf(node);
                node.parent.children.splice(index, 1, ...nodeChildren);
                for (let selectedChild of nodeChildren) {
                    selectedChild.parent = node.parent;
                }
            }
        });

        if (deletedNodeIds.size !== selectedNodes.size) {
            utils.msg("部分选择的节点不能删除", "warning");
        }

        return deletedNodeIds;
    }
}