import {ipcRenderer} from "electron";
import Vue from "vue";

/**
 * @param el {Element|String} 元素或者选择器
 * @returns {Element|*}
 */
function getElement(el) {
    if (typeof el === 'string') {
        return document.querySelector(el);
    } else {
        return el;
    }
}

export default {
    events: new Vue(),
    msg(msg, type = "success") {
        Vue.prototype.$message({message: msg, type, center: true, offset: 200});
    },
    /**
     * 获取元素el1相对元素el2的OffsetX
     * @param el1 {Element|String} 元素或者选择器
     * @param el2 {Element|String} 元素或者选择器
     * @returns {number}
     */
    getOffsetX(el1, el2 = null) {
        let element1 = getElement(el1);
        let element2 = getElement(el2);
        if (!element1 || element1 === element2) {
            return 0;
        } else if (element1.offsetParent && element2 !== element1.offsetParent) {
            return this.getOffsetX(element1.offsetParent, element2) + element1.offsetLeft;
        } else {
            return element1.offsetLeft;
        }
    },
    /**
     * 获取元素el1相对元素el2的OffsetY
     * @param el1 {Element|String} 元素或者选择器
     * @param el2 {Element|String} 元素或者选择器
     * @returns {number}
     */
    getOffsetY(el1, el2 = null) {
        let element1 = getElement(el1);
        let element2 = getElement(el2);
        if (!element1 || element1 === element2) {
            return 0;
        } else if (element1.offsetParent && element2 !== element1.offsetParent) {
            return this.getOffsetY(element1.offsetParent, element2) + element1.offsetTop;
        } else {
            return element1.offsetTop;
        }
    },
    /**
     * 判断元素内容有没有溢出
     * @param el {Element|String} 元素或者选择器
     * @param axis {"x"|"y"} x轴或者y轴
     * @returns {boolean}
     */
    checkOverflow(el, axis = "x") {
        let element = getElement(el);
        let clone = element.cloneNode();
        clone.style.zIndex = -1;
        clone.style.overflow = "auto";
        clone.style.opacity = 0;
        clone.innerHTML = element.innerHTML;

        element.parentNode.appendChild(clone);

        let overflow;
        if (axis === "x") {
            overflow = clone.scrollWidth > clone.clientWidth;
        } else if (axis === "y") {
            overflow = clone.scrollHeight > clone.clientHeight;
        }

        element.parentNode.removeChild(clone);

        return overflow;
    },
    /**
     * 节点x轴间隔空间
     */
    nodeSpaceX(node) {
        if (node.children.length <= 3) {
            return 30;
        } else if (node.children.length <= 8) {
            return 50;
        } else {
            return 70;
        }
    },
    /**
     * 节点y轴间隔空间
     */
    nodeSpaceY: 20,
    initNode(node, parent, tree) {
        node.parent = parent;
        node.tree = tree;
        tree.maxNodeId = Math.max(tree.maxNodeId, node.id);
        Vue.set(tree, "childrenFolded", tree.childrenFolded || node.childrenFolded);

        Vue.set(node, "x", 0);
        Vue.set(node, "y", 0);
        Vue.set(node, "z", 1);
        Vue.set(node, "folded", true);

        if (!node.params) {
            Vue.set(node, "params", []);
        }
        if (!node.children) {
            Vue.set(node, "children", []);
        }
        if (!node.childrenFolded) {
            Vue.set(node, "childrenFolded", false);
        }
    },
    /**
     * 访问子树的所有节点
     * @param node {Object} 子树的根节点
     * @param visit {function} 访问函数
     * @param parent
     */
    visitSubtree(node, visit, parent = null) {
        if (visit(node, parent) === false) {
            return;
        }
        if (node.children) {
            for (let child of node.children) {
                this.visitSubtree(child, visit, node);
            }
        }
    },
    calcNodeBounds(node, getNodeElement) {
        if (!node || !getNodeElement) {
            return;
        }

        let nodeElement = getNodeElement(node);

        //界面渲染完成之后才能取到元素大小
        node.selfWidth = nodeElement.offsetWidth + this.nodeSpaceX(node);
        node.selfHeight = nodeElement.offsetHeight + this.nodeSpaceY;

        if (!node.children.length || node.childrenFolded) {
            node.treeWidth = node.selfWidth;
            node.treeHeight = node.selfHeight;
            return;
        }

        let maxChildWidth = 0;
        let childrenHeight = 0;

        for (let child of node.children) {
            this.calcNodeBounds(child, getNodeElement);
            if (child.treeWidth > maxChildWidth) {
                maxChildWidth = child.treeWidth;
            }
            childrenHeight += child.treeHeight;
        }

        node.treeWidth = node.selfWidth + maxChildWidth;
        node.treeHeight = Math.max(node.selfHeight, childrenHeight);
        node.childrenHeight = childrenHeight;
    },
    calcNodePosition(node, top) {
        if (!node) {
            return;
        }
        if (node.parent) {
            node.x = node.parent.x + node.parent.selfWidth;
        } else {
            // noinspection JSSuspiciousNameCombination
            node.x = top;
        }

        if (!node.children.length || node.childrenFolded) {
            node.y = top;
            return;
        }

        if (node.treeHeight <= node.childrenHeight) {
            for (let child of node.children) {
                this.calcNodePosition(child, top);
                top += child.treeHeight;
            }
            if (node.children.length > 1) {
                let lastChild = node.children[node.children.length - 1];
                node.y = (node.children[0].y + lastChild.y + lastChild.selfHeight - node.selfHeight) / 2;
            } else {
                node.y = node.children[0].y + node.children[0].selfHeight / 2 - node.selfHeight / 2;
            }
        } else {
            // 父节点比所有子树高度之和还高
            node.y = top;
            top += (node.selfHeight - node.childrenHeight) / 2;
            for (let child of node.children) {
                this.calcNodePosition(child, top);
                top += child.treeHeight;
            }
        }
    },
    canLinkNode(node, targetNode, targetChildrenNum = null) {
        if (!targetNode || targetNode === node || targetNode.childrenFolded) {
            return false;
        }

        //目标节点限制子节点模板类型或者模板ID
        if (node.template.type && targetNode.template.childrenTypes.indexOf(node.template.type.id) < 0 &&
            (!targetNode.template.childrenIds || targetNode.template.childrenIds.indexOf(node.template.id) < 0)) {
            return false;
        }

        if (targetChildrenNum === null) {
            targetChildrenNum = targetNode.children.length;
        }

        if (targetChildrenNum >= 0) {
            //目标节点限制子节点数量
            return !(targetNode.children.indexOf(node) < 0
                && targetNode.template.childrenNum >= 0
                && targetChildrenNum >= targetNode.template.childrenNum);
        }

        return true;
    },
    canReplaceNode(node, targetNode) {
        if (!node || !targetNode || !targetNode.parent) {
            return false;
        }
        if (!this.canLinkNode(node, targetNode.parent, -1)) {
            return false;
        }
        if (node.template.childrenNum >= 0 && targetNode.children.length > node.template.childrenNum) {
            return false;
        }
        for (let targetChild of targetNode.children) {
            if (!this.canLinkNode(targetChild, node, -1)) {
                return false;
            }
        }

        return true;
    },
    findParentNode(node) {
        let x1 = node.x;
        let y1 = node.y + (node.selfHeight - this.nodeSpaceY) / 2;

        //寻找最近的的节点作为父节点
        let newParent = null;
        let minDistance2 = -1;

        this.visitSubtree(node.tree.root, targetNode => {
            if (!targetNode || targetNode === node || targetNode.childrenFolded) {
                return false;
            }

            if (this.canLinkNode(node, targetNode)) {
                let x2 = (node.tree.deltaX || 0) + targetNode.x + targetNode.selfWidth - this.nodeSpaceX(targetNode);
                let y2 = (node.tree.deltaY || 0) + targetNode.y + (targetNode.selfHeight - this.nodeSpaceY) / 2;

                let distance2 = (x1 - x2) ** 2 + (y1 - y2) ** 2;
                if (!newParent || x1 > x2 && distance2 < minDistance2) {
                    minDistance2 = distance2;
                    newParent = targetNode;
                }
            }
        });

        return newParent;
    },
    linkParentNode(node, newParent, getNodeElement) {
        let oldParent = node.parent;
        if (!newParent) {
            newParent = this.findParentNode(node);
        }

        if (!newParent) {
            return;
        }

        if (node.creating) {
            node.parent = newParent;
            return;
        }

        //关联父子节点
        if (node.parent && node.parent.children) {
            let index = node.parent.children.indexOf(node);
            if (index >= 0) {
                node.parent.children.splice(index, 1);
            }
        }
        node.parent = newParent;
        newParent.children.push(node);

        //按y轴排序兄弟节点
        newParent.children.sort((n1, n2) => n1.y - n2.y);

        if (oldParent !== node.parent) {
            this.calcNodeBounds(oldParent, getNodeElement);
            this.calcNodeBounds(node.parent, getNodeElement);
        }
    },
    buildNode(node) {
        let result = {id: node.id, tid: node.tid};
        if (node.template.comment) {
            result.comment = node.comment;
        }

        if (node.template.params) {
            result.params = {};
            for (let param of node.template.params) {
                let paramValue = node.params[param.name];
                if (Array.isArray(paramValue)) {
                    result.params[param.name] = [...paramValue];
                } else {
                    result.params[param.name] = paramValue;
                }
            }
        }

        return result;
    },
    /**
     * 构造子树数据
     * @param node {Object} 子树根节点
     * @param resolveChildren {Function|null} 解析子节点的函数
     * @returns {Object}
     */
    buildSubtree(node, resolveChildren = null) {
        let result = this.buildNode(node);

        let children = node.children;
        if (resolveChildren) {
            children = resolveChildren(node);
        }

        if (children && children.length) {
            result.children = [];
            result.childrenFolded = node.childrenFolded;
            for (let child of children) {
                result.children.push(this.buildSubtree(child, resolveChildren))
            }
        }

        return result;
    },
    /**
     * 保存行为树
     * @param tree
     * @returns {Promise<void>}
     */
    async saveTree(tree) {
        if (tree && !tree.renaming) {
            let root = this.buildSubtree(tree.root);
            let result = {id: tree.id, name: tree.name, root};
            await ipcRenderer.invoke("save-tree", result);
        }
    }
}