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
     * 获取元素ClientY 元素或者选择器
     * @param el {Element|String}
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
     * 深度优先遍历行为树,访问当前节点和所有子孙节点
     * @param node {Object} 当前节点
     * @param visit {function} 访问函数
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
        let build = node => {
            let result = {id: node.id, name: node.name, tid: node.tid, collapsed: node.collapsed};
            if (node.params.length) {
                result.params = [];
                for (let param of node.params) {
                    result.params.push({name: param.name, value: param.value});
                }
            }
            if (node.children.length) {
                result.children = [];
                for (let child of node.children) {
                    result.children.push(build(child))
                }
            }
            return result;
        };

        let builtTree = {id: tree.id, name: tree.name, root: build(tree.root)};

        await ipcRenderer.invoke("save-tree", builtTree);
    }
}