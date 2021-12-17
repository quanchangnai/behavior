<template>
    <div style="height: 100%;width: 100%" @contextmenu="onContextMenu">
        <el-table border
                  ref="table"
                  size="medium"
                  :height="'100%'"
                  :data="visibleTrees"
                  highlight-current-row
                  @current-change="selectTree"
                  @row-contextmenu="(r,c,e)=>onContextMenu(e,r)">
            <el-table-column>
                <template #header>
                    <el-input v-model="keyword"
                              clearable
                              size="medium"
                              placeholder="输入关键字搜索"
                              prefix-icon="el-icon-search"/>
                </template>
                <template #default="{row:tree}">
                    <div> {{ tree.name }}</div>
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
            maxTreeId: 0,
            keyword: "",
            menuItems: []
        }
    },
    async created() {
        this.allTrees = await ipcRenderer.invoke("load-trees");
        for (const tree of this.allTrees) {
            this.maxTreeId = Math.max(this.maxTreeId, tree.id);
        }

        this.visibleTrees = this.allTrees;
        if (this.visibleTrees.length) {
            this.$refs.table.setCurrentRow(this.visibleTrees[0]);
        }

        this.$events.$on("delete-tree", this.deleteTree);
    },
    destroyed() {
        this.$events.$off("delete-tree", this.deleteTree);
    },
    watch: {
        keyword(value) {
            this.visibleTrees = this.allTrees.filter(tree => {
                return tree === this.selectedTree || tree.name.includes(value);
            });
        }
    },
    methods: {
        selectTree(tree) {
            this.selectedTree = tree;
            if (tree && !tree.root.tree) {
                //第一次选中
                this.initTree(tree)
            }
            this.$emit("select-tree", tree);
        },
        initTree(tree) {
            tree.root.tree = tree;
            tree.maxNodeId = 0;

            utils.visitNodes(tree.root, node => {
                tree.maxNodeId = Math.max(tree.maxNodeId, node.id);
                this.$set(node, "x", 0);
                this.$set(node, "y", 0);
                this.$set(node, "z", 1);
                this.$set(node, "detailed", false);
                if (!node.params) {
                    this.$set(node, "params", []);
                }
                if (!node.children) {
                    this.$set(node, "children", []);
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

            this.$refs.menu.show(event.clientX, event.clientY);
        },
        createTree() {
            let tree = JSON.parse(JSON.stringify(this.defaultTree));
            tree.id = ++this.maxTreeId;
            tree.name = tree.name + this.maxTreeId;

            this.allTrees.push(tree);
            this.$refs.table.setCurrentRow(tree);

            utils.saveTree(tree);
        },
        deleteTree(tree) {
            let index = this.allTrees.indexOf(tree);
            this.allTrees.splice(index, 1);
            if (this.selectedTree === tree && this.visibleTrees.length) {
                this.$refs.table.setCurrentRow(this.visibleTrees[0]);
            }

            ipcRenderer.invoke("delete-tree", tree.id);
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