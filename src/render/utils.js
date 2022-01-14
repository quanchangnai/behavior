import {ipcRenderer} from "electron";

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
        if (element.offsetParent) {
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
        if (element.offsetParent) {
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
        clone.style.position = "absolute";
        clone.style.width = element.offsetWidth + "px";
        clone.style.height = element.offsetHeight + "px";
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
        for (let child of node.children) {
            this.visitNodes(child, visit, node);
        }
    },

    /**
     * 保存行为树
     * @param tree
     * @returns {Promise<void>}
     */
    async saveTree(tree) {
        if (!tree) {
            return;
        }

        let build = node => {
            let result = {id: node.id, tid: node.tid};
            if (node.template.nodeName) {
                result.name = node.name;
            }

            let params = Object.keys(node.params);
            if (params.length) {
                result.params = {};
                for (let paramName of params) {
                    result.params[paramName] = node.params[paramName];
                }
            }

            if (node.children.length) {
                result.children = [];
                result.childrenFolded = node.childrenFolded;
                for (let child of node.children) {
                    result.children.push(build(child))
                }
            }

            return result;
        };

        let result = {id: tree.id, name: tree.name, root: build(tree.root)};

        await ipcRenderer.invoke("save-tree", result);
    }
}