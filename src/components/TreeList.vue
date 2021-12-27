<template>
    <div ref="body"
         style="height: 100%;width: 100%"
         @contextmenu="onContextMenu">
        <el-table border
                  ref="table"
                  size="medium"
                  :height="'100%'"
                  :data="visibleTrees"
                  highlight-current-row
                  @current-change="selectTree"
                  @row-dblclick="showEditTreeNameInput"
                  @row-contextmenu="(r,c,e)=>onContextMenu(e,r)">
            <template #empty>
                <el-button type="text" @click="createTree">创建行为树&nbsp;&nbsp;&nbsp;&nbsp;</el-button>
            </template>
            <el-table-column>
                <template #header>
                    <el-input v-model="keyword"
                              clearable
                              size="small"
                              placeholder="输入关键字搜索"
                              prefix-icon="el-icon-search"/>
                </template>
                <template #default="{row:tree}">
                    <div>
                        <span :ref="'treeIdTag-'+tree.id">
                            <el-tag size="small" style="margin-right: 10px;">{{ tree.id }}</el-tag>
                        </span>
                        <el-input v-if="editTreeName&&tree===selectedTree"
                                  ref="editTreeNameInput"
                                  size="mini"
                                  v-model="tree.name"
                                  @focusout.native="editTreeName=false"
                                  :style="editTreeNameInputStyle(tree.id)"/>
                        <span v-else>{{ tree.name }}</span>
                    </div>
                </template>
            </el-table-column>
        </el-table>
        <context-menu ref="menu" :items="menuItems"/>
    </div>
</template>

<script>
import {ipcRenderer} from 'electron'
import ContextMenu from './ContextMenu'
import utils from "@/utils";

export default {
    name: "TreeList",
    components: {ContextMenu},
    props: {
        defaultTree: Object
    },
    data() {
        return {
            allTrees: null,
            visibleTrees: null,
            selectedTree: null,
            editTreeName: false,
            maxTreeId: 0,
            keyword: "",
            menuItems: []
        }
    },
    async created() {
        await this.loadTrees();
        ipcRenderer.on("create-tree", this.createTree);
        this.$events.$on("delete-tree", this.deleteTree);
    },
    destroyed() {
        this.$events.$off("delete-tree", this.deleteTree);
    },
    watch: {
        keyword(value) {
            this.visibleTrees = this.allTrees.filter(tree => {
                return tree === this.selectedTree || tree.name.includes(value) || tree.id.toString().includes(value);
            });
        }
    },
    methods: {
        async loadTrees() {
            this.allTrees = await ipcRenderer.invoke("load-trees");

            for (const tree of this.allTrees) {
                this.maxTreeId = Math.max(this.maxTreeId, tree.id);
            }

            this.visibleTrees = this.allTrees;
            if (this.visibleTrees.length) {
                this.$refs.table.setCurrentRow(this.visibleTrees[0]);
            }
        },
        selectTree(tree) {
            this.selectedTree = tree;
            if (tree && !tree.maxNodeId !== undefined) {
                //第一次选中
                this.initTree(tree)
            }
            this.$emit("select-tree", tree);
        },
        initTree(tree) {
            tree.maxNodeId = 0;
            this.$set(tree, "folded", 1);

            utils.visitNodes(tree.root, (node, parent) => {
                tree.maxNodeId = Math.max(tree.maxNodeId, node.id);
                this.$set(tree, "childrenFolded", tree.childrenFolded || node.childrenFolded);
                node.parent = parent;
                this.$set(node, "x", 0);
                this.$set(node, "y", 0);
                this.$set(node, "z", 1);
                this.$set(node, "folded", true);
                if (!node.params) {
                    this.$set(node, "params", []);
                }
                if (!node.children) {
                    this.$set(node, "children", []);
                }
                if (!node.childrenFolded) {
                    this.$set(node, "childrenFolded", false);
                }
            });

            this.$events.$emit("init-tree", tree);
        },
        onContextMenu(event, tree) {
            event.stopPropagation();

            this.menuItems.splice(0, this.menuItems.length);
            this.menuItems.push({title: '创建行为树', handler: this.createTree});
            if (tree != null) {
                this.menuItems.push({title: '删除行为树', handler: () => this.deleteTree(tree)});
            }
            this.menuItems.push({title: '打开工作目录', handler: () => ipcRenderer.invoke("open-work-path")});

            let body = this.$refs.body;
            let limits = {
                x: utils.getClientX(body),
                y: utils.getClientY(body),
                width: body.offsetWidth,
                height: body.offsetHeight,
            };
            this.$refs.menu.show(event.clientX, event.clientY, limits);
        },
        createTree() {
            let tree = JSON.parse(JSON.stringify(this.defaultTree));
            tree.id = ++this.maxTreeId;
            tree.name = tree.name + this.maxTreeId;

            this.allTrees.push(tree);
            this.$refs.table.setCurrentRow(tree);

            utils.saveTree(tree);
        },
        async deleteTree(tree) {
            try {
                await this.$confirm("确定删除行为树？", {type: "warning"});
            } catch {
                return;
            }
            let index = this.allTrees.indexOf(tree);
            this.allTrees.splice(index, 1);
            if (this.selectedTree === tree && this.visibleTrees.length) {
                this.$refs.table.setCurrentRow(this.visibleTrees[0]);
            }
            await ipcRenderer.invoke("delete-tree", tree.id);
        },
        editTreeNameInputStyle(treeId) {
            // noinspection JSUnresolvedVariable
            let treeIdTagWidth = this.$refs['treeIdTag-' + treeId].offsetWidth;
            return {width: "calc(100% - " + (treeIdTagWidth + 2) + "px)"}
        },
        async showEditTreeNameInput() {
            this.editTreeName = true;
            await this.$nextTick();
            this.$refs.editTreeNameInput.focus();
        }
    }
}
</script>

<style scoped>
/*noinspection CssUnusedSymbol*/
.el-table {
    height: 100%;
}
</style>