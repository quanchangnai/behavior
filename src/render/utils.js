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