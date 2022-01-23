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
     *获取元素ClientX
     * @param el {Element|String} 元素或者选择器
     * @returns {number}
     */
    getClientX(el) {
        let element = getElement(el);
        if (!element) {
            return 0;
        } else if (element.offsetParent) {
            return this.getClientX(element.offsetParent) + element.offsetLeft;
        } else {
            return element.offsetLeft;
        }
    },
    /**
     * 获取元素ClientY
     * @param el {Element|String} 元素或者选择器
     * @returns {number}
     */
    getClientY(el) {
        let element = getElement(el);
        if (!element) {
            return 0;
        } else if (element.offsetParent) {
            return this.getClientY(element.offsetParent) + element.offsetTop;
        } else {
            return element.offsetTop;
        }
    },
    /**
     * 判断元素内容有没有溢出
     * @param el {Element|String} 元素或者选择器
     * @param axis {"x"|"y"} x轴或者y轴
     * @param d {number} 决定是否溢出的差值
     * @returns {boolean}
     */
    checkOverflow(el, axis = "x", d = 0) {
        let element = getElement(el);
        let clone = element.cloneNode();
        clone.style.zIndex = -1;
        clone.style.overflow = "auto";
        clone.style.opacity = 0;
        clone.style.whiteSpace = "nowrap";
        clone.innerHTML = element.innerHTML;

        element.parentNode.appendChild(clone);

        let overflow;
        if (axis === "x") {
            overflow = clone.scrollWidth > element.offsetWidth + d;
        } else if (axis === "y") {
            overflow = clone.scrollHeight > element.offsetHeight + d;
        }

        element.parentNode.removeChild(clone);

        return overflow;
    },
    /**
     * 访问节点及其所有子孙节点
     * @param node {Object} 当前节点
     * @param visit {function} 访问函数
     * @param parent
     */
    visitNodes(node, visit, parent = null) {
        if (visit(node, parent) === false) {
            return;
        }
        if (node.children) {
            for (let child of node.children) {
                this.visitNodes(child, visit, node);
            }
        }
    },
    initNode(tree, node, parent) {
        tree.maxNodeId = Math.max(tree.maxNodeId, node.id);
        Vue.set(tree, "childrenFolded", tree.childrenFolded || node.childrenFolded);

        node.tree = tree;
        node.parent = parent;

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
    buildNodes(node) {
        let result = {id: node.id, tid: node.tid};
        if (node.template.comment) {
            result.comment = node.comment;
        }

        if (node.template.params) {
            result.params = {};
            for (let param of node.template.params) {
                result.params[param.name] = node.params[param.name];
            }
        }

        if (node.children && node.children.length) {
            result.children = [];
            result.childrenFolded = node.childrenFolded;
            for (let child of node.children) {
                result.children.push(this.buildNodes(child))
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
        if (tree) {
            let root = this.buildNodes(tree.root);
            let result = {id: tree.id, name: tree.name, root};
            await ipcRenderer.invoke("save-tree", result);
        }
    }
}