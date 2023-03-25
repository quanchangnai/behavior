import Vue from "vue";
import utils from "./utils";

/**
 * 行为树剪切板，行为树剪切、复制、粘贴、删除相关功能
 */
export default {
    onSelectTree(tree) {
        this.tree = tree;
        this.snapshots = [];
        this.snapshotIndex = -1;
        this.selectedNodes = new Map();

        if (tree) {
            let jsonTree = JSON.stringify(utils.buildTree(tree));
            this.snapshot(jsonTree);
        }
    },
    snapshot(jsonTree) {
        if (this.snapshotIndex < this.snapshots.length - 1) {
            this.snapshots.splice(this.snapshotIndex + 1, this.snapshots.length - this.snapshotIndex - 1);
        }
        this.snapshots.push(jsonTree);
        if (this.snapshots.length < 20) {
            this.snapshotIndex++;
        } else {
            this.snapshots.shift();
        }
    },
    restore() {
        let snapshot = this.snapshots[this.snapshotIndex];
        let tree = JSON.parse(snapshot);
        this.tree.root = tree.root;
        utils.initTree(this.tree);
        utils.saveTree(this.tree, false);
    },
    undo() {
        if (!this.tree || this.snapshotIndex <= 0) {
            return;
        }
        this.snapshotIndex--;
        this.restore();
    },
    redo() {
        if (!this.tree || this.snapshotIndex >= this.snapshots.length - 1) {
            return;
        }
        this.snapshotIndex++;
        this.restore();
    },
    onSelectNode(node, selected) {
        if (!this.selectedNodes) {
            this.selectedNodes = new Map();
        }
        if (selected) {
            this.selectedNodes.set(node.id, node);
        } else {
            this.selectedNodes.delete(node.id);
        }

        if (this.selectedNodes.size < 1) {
            this.selectedType = null;
            return;
        }

        this.selectedType = "allAreLeaves";
        for (let selectedNode of this.selectedNodes.values()) {
            if (selectedNode.children.length) {
                this.selectedType = "hasSubtrees";
                break;
            }
        }
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
            return this.selectedNodes.has(node.id) || descendantSelected;
        };
        checkDescendantsSelected(this.tree.root);

        let getNodeChildren = node => {
            let selectedChildren = node.children.filter(child => this.selectedNodes.has(child.id));
            if (selectedChildren.length === 0 && !descendantsSelectedMap.get(node)) {
                return node.children;
            } else {
                return selectedChildren;
            }
        };

        for (let selectedNode of this.selectedNodes.values()) {
            if (!this.selectedNodes.has(selectedNode.parent.id)) {
                let copiedNode = utils.buildSubtree(selectedNode, getNodeChildren);
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
        for (let selectedNode of this.selectedNodes.values()) {
            let copiedNode = utils.buildNode(selectedNode);
            this.copiedNodes.push(copiedNode);
            utils.events.$emit("init-tree", copiedNode);
        }
    },
    pasteNodes(targetNode) {
        if (!this.copiedNodes || !this.copiedNodes.length) {
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

        utils.saveTree(this.tree);

        return pastedCount > 0;
    },
    async deleteSubtrees(cut = false) {
        let selectedNodes = [...this.selectedNodes.values()];
        if (selectedNodes.size < 1) {
            return;
        }

        let operation = cut ? "剪切" : "删除";
        let allAreLeaves = true;
        let deletedNodeIds = new Set();

        for (let selectedNode of selectedNodes) {
            allAreLeaves &= selectedNode.children.length === 0;
            if (selectedNode.parent) {
                utils.visitSubtree(selectedNode, node => deletedNodeIds.add(node.id));
            }
        }

        if (deletedNodeIds.size < 1) {
            utils.msg(`不能${operation}选择的` + (allAreLeaves ? "节点" : "子树"), "warning");
            return;
        }

        try {
            if (!allAreLeaves) {
                await Vue.prototype.$confirm(`确定${operation}选择的节点及其所有子孙节点？`, {type: "warning"});
            }
        } catch {
            return;
        }

        if (cut) {
            this.copiedNodes = [];
        }

        for (let selectedNode of selectedNodes) {
            if (!selectedNode.parent) {
                continue
            }
            if (cut) {
                let copiedNode = utils.buildSubtree(selectedNode);
                this.copiedNodes.push(copiedNode);
                utils.events.$emit("init-tree", copiedNode);
            }

            let index = selectedNode.parent.children.indexOf(selectedNode);
            selectedNode.parent.children.splice(index, 1);
        }

        utils.saveTree(this.tree);

        return deletedNodeIds;
    },
    deleteNodes(cut = false) {
        if (this.selectedNodes.size < 1) {
            return;
        }

        //待删除节点的子节点列表
        let deleteNodeChildrenMap = new Map();
        let pushSelectedChildren = (node, children) => {
            for (let child of node.children) {
                if (this.selectedNodes.has(child.id)) {
                    pushSelectedChildren(child, children);
                } else {
                    children.push(child);
                }
            }
        };

        for (let selectedNode of this.selectedNodes.values()) {
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

        let operation = cut ? "剪切" : "删除";
        let deletedNodes = new Set();

        if (deleteNodeChildrenMap.size < 1) {
            utils.msg(`不能${operation}选择的节点`, "warning");
            return;
        }

        //待删除节点的父节点对应的新子节点列表
        let parentChildrenMap = new Map();

        utils.visitSubtree(this.tree.root, node => {
            if (!node.parent) {
                return;
            }
            if (deletedNodes.has(node.parent)) {
                deletedNodes.add(node);
                return;
            }
            let deleteNodeChildren = deleteNodeChildrenMap.get(node);
            if (deleteNodeChildren) {
                deletedNodes.add(node);
                let parentChildren = parentChildrenMap.get(node.parent);
                if (!parentChildren) {
                    parentChildren = [...node.parent.children];
                    parentChildrenMap.set(node.parent, parentChildren)
                }
                let index = parentChildren.indexOf(node);
                //把自己从父节点上删除，并把自己的孩子节点挂在父节点上
                parentChildren.splice(index, 1, ...deleteNodeChildren);
                for (let deleteNodeChild of deleteNodeChildren) {
                    deleteNodeChild.parent = node.parent;
                }
            }
        });

        parentChildrenMap.forEach((value, key) => key.children = value);

        let deletedNodeIds = new Set();

        if (cut) {
            this.copiedNodes = [];
        }

        for (let deletedNode of deletedNodes) {
            deletedNodeIds.add(deletedNode.id);
            if (cut) {
                let copiedNode = utils.buildNode(deletedNode);
                this.copiedNodes.push(copiedNode);
                utils.events.$emit("init-tree", copiedNode);
            }
        }

        if (deletedNodeIds.size !== this.selectedNodes.size) {
            utils.msg(`部分选择的节点不能${operation}`, "warning");
        }

        utils.saveTree(this.tree);

        return deletedNodeIds;
    }
}