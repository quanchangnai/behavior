import {ipcRenderer} from "electron";

export default {
    /**
     *获取元素ClientX
     * @param el {Element|String} 元素或者选择器
     * @returns {number}
     */
    getClientX(el) {
        let element;
        if (typeof el === 'string') {
            element = document.querySelector(el);
        } else {
            element = el
        }
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
        let element;
        if (typeof el === 'string') {
            element = document.querySelector(el);
        } else {
            element = el
        }
        if (element.offsetParent) {
            return this.getClientY(element.offsetParent) + element.offsetTop;
        } else {
            return element.offsetTop;
        }
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
            let result = {id: node.id, name: node.name, tid: node.tid};

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