import Vue from "vue";
import {ipcRenderer} from "electron";
import clipboard from "./clipboard";

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
    /**
     * 显示提示消息
     * @param msg {string} 消息文本
     * @param type {'success' | 'warning' | 'info' | 'error'} 消息类型
     */
    msg(msg, type = "success") {
        Vue.prototype.$message({message: msg, type, center: true, offset: 300});
    },
    md5: require("md5").bind(this),
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
    calcTextWidth(text, fontSize) {
        const span = document.createElement('span')
        document.body.append(span);
        span.innerText = text
        if (fontSize) {
            span.style.fontSize = fontSize + 'px';
        }
        span.style.position = 'absolute'
        let width = span.offsetWidth
        document.body.removeChild(span)
        return width
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
    initTree(tree) {
        tree.maxNodeId = 0;
        Vue.set(tree, "folded", 1);
        Vue.set(tree, "showNodeId", false);
        Vue.set(tree, "debugging", false);

        this.events.$emit("init-tree", tree.root);

        this.visitSubtree(tree.root, (node, parent) => {
            tree.folded |= node.folded ? 1 : 2;
            this.initNode(node, parent, tree);
        });

    },
    initNode(node, parent, tree) {
        node.parent = parent;

        if (tree) {
            node.tree = tree;
            tree.maxNodeId = Math.max(tree.maxNodeId, node.id);
            Vue.set(tree, "childrenFolded", tree.childrenFolded || node.childrenFolded);
        }

        Vue.set(node, "x", 0);
        Vue.set(node, "y", 0);
        Vue.set(node, "z", 1);

        Vue.set(node, "params", node.params || []);
        Vue.set(node, "errorParams", new Set());
        Vue.set(node, "children", node.children || []);
        Vue.set(node, "childrenFolded", node.childrenFolded || false);
        Vue.set(node, "selected", false);
        Vue.set(node, "running", false);
        Vue.set(node, "breakPointState", 0);

        this.checkNodeParams(node);
    },
    checkNodeParams(node) {
        let params = node.template.params;
        if (!params || node.creating) {
            return;
        }

        node.errorParams = new Set();

        let checkParamValue = (type, value, required, pattern) => {
            if (value === undefined || value === null) {
                return !required;
            }

            if (type === "int" || type === "float") {
                if (typeof value !== "number" || type === "int" && value !== Math.floor(value)) {
                    return false;
                }
                type = "number";
            }

            if (typeof value !== type) {
                return false;
            }

            return !(pattern && !new RegExp(pattern).test(value));
        }

        for (let param of params) {
            let paramValue = node.params[param.name];
            if (Array.isArray(paramValue)) {
                for (let paramOptionValue of paramValue) {
                    if (!checkParamValue(param.type, paramOptionValue, true, param.pattern)) {
                        node.errorParams.add(param.name);
                        break;
                    }
                }
            } else if (!checkParamValue(param.type, node.params[param.name], param.required, param.pattern)) {
                node.errorParams.add(param.name);
            }
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
            node.subtreeWidth = node.selfWidth;
            node.subtreeHeight = node.selfHeight;
            return;
        }

        let maxChildWidth = 0;
        let childrenHeight = 0;

        for (let child of node.children) {
            this.calcNodeBounds(child, getNodeElement);
            if (child.subtreeWidth > maxChildWidth) {
                maxChildWidth = child.subtreeWidth;
            }
            childrenHeight += child.subtreeHeight;
        }

        node.subtreeWidth = node.selfWidth + maxChildWidth;
        node.subtreeHeight = Math.max(node.selfHeight, childrenHeight);
        node.childrenHeight = childrenHeight;
    },
    calcNodePositions(node, top) {
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

        if (node.subtreeHeight <= node.childrenHeight) {
            for (let child of node.children) {
                this.calcNodePositions(child, top);
                top += child.subtreeHeight;
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
                this.calcNodePositions(child, top);
                top += child.subtreeHeight;
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
    findParentNode(node) {
        let x1 = node.x;
        let y1 = node.y + (node.selfHeight - this.nodeSpaceY) / 2;

        let deltaX = node.tree.deltaX || 0;
        let deltaY = node.tree.deltaY || 0;
        let scale = node.creating ? node.tree.scale : 1;

        //寻找最近的的节点作为父节点
        let newParent = null;
        let minDistance2 = -1;

        this.visitSubtree(node.tree.root, targetNode => {
            if (!targetNode || targetNode === node || targetNode.childrenFolded) {
                return false;
            }

            if (this.canLinkNode(node, targetNode)) {
                let x2 = deltaX + (targetNode.x + targetNode.selfWidth - this.nodeSpaceX(targetNode)) * scale;
                let y2 = deltaY + (targetNode.y + (targetNode.selfHeight - this.nodeSpaceY) / 2) * scale;

                let distance2 = (x1 - x2) ** 2 + (y1 - y2) ** 2;
                if (!newParent || x1 >= x2 && distance2 < minDistance2) {
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
        newParent.children.sort((n1, n2) => n1.y - n2.y);//按y轴排序兄弟节点

        if (oldParent !== node.parent) {
            this.calcNodeBounds(oldParent, getNodeElement);
            this.calcNodeBounds(node.parent, getNodeElement);
        }
    },
    canReplaceNode(node, targetNode) {
        if (!node || !targetNode || !targetNode.parent) {
            return false;
        }
        if (node === targetNode) {
            return false;
        }
        if (!this.canLinkNode(node, targetNode.parent, -1)) {
            return false;
        }
        if (node.template.childrenNum >= 0 && (targetNode.children.length + node.children.length) > node.template.childrenNum) {
            return false;
        }
        for (let targetChild of targetNode.children) {
            if (!this.canLinkNode(targetChild, node, -1)) {
                return false;
            }
        }

        return true;
    },
    replaceNode(node, targetNode) {
        node.replacing = false;

        if (node.parent) {
            let draggingNodeIndex = node.parent.children.indexOf(node);
            if (draggingNodeIndex >= 0) {
                node.parent.children.splice(draggingNodeIndex, 1);
            }
        }

        node.parent = targetNode.parent;
        node.children = [...targetNode.children, ...node.children];

        let targetNodeIndex = targetNode.parent.children.indexOf(targetNode);
        Vue.set(targetNode.parent.children, targetNodeIndex, node);
        for (let child of targetNode.children) {
            child.parent = node;
        }

        this.saveTree(node.tree);
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
     * @param getChildren {Function} 获取子节点的函数
     * @returns {Object}
     */
    buildSubtree(node, getChildren = null) {
        let result = this.buildNode(node);

        let children = node.children;
        if (getChildren) {
            children = getChildren(node);
        }

        if (children && children.length) {
            result.children = [];
            result.childrenFolded = node.childrenFolded;
            for (let child of children) {
                result.children.push(this.buildSubtree(child, getChildren))
            }
        }

        return result;
    },
    buildTree(tree) {
        let root = this.buildSubtree(tree.root);
        return {id: tree.id, name: tree.name, root};
    },
    /**
     * 保存行为树
     */
    saveTree(tree, snapshot = true) {
        let builtTree = this.buildTree(tree);
        let jsonTree = JSON.stringify(builtTree);

        let md5 = this.md5(jsonTree);
        if (tree.md5 === md5) {
            return;
        }
        tree.md5 = md5;

        if (snapshot) {
            clipboard.snapshot(jsonTree);
        }

        ipcRenderer.invoke("save-tree", builtTree).then();
    }
}