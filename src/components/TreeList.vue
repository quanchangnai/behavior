<template>
    <div id="body" ref="body" @contextmenu="onContextMenu">
        <div id="search">
            <el-input v-model="keyword"
                      clearable
                      size="small"
                      placeholder="输入关键字搜索"
                      prefix-icon="el-icon-search"/>
        </div>
        <el-scrollbar ref="scrollbar" :style="{height: tableHeight}">
            <el-table ref="table"
                      size="medium"
                      :show-header="false"
                      :data="visibleTrees"
                      highlight-current-row
                      tooltip-effect="light"
                      @current-change="selectTree"
                      @row-dblclick="showRenameTreeInput"
                      @row-contextmenu="(r,c,e)=>onContextMenu(e,r)">
                <template #empty>
                    <el-button type="text" @click="createTree">
                        创建行为树&nbsp;&nbsp;&nbsp;&nbsp;
                    </el-button>
                </template>
                <el-table-column #default="{row:tree}" :show-overflow-tooltip="true">
                    <div>
                        <span :ref="'treeIdTag-'+tree.id">
                            <el-tag size="small" style="margin-right: 10px;">{{ tree.id }}</el-tag>
                        </span>
                        <el-input v-if="renameTree&&tree===selectedTree"
                                  ref="renameTreeInput"
                                  size="mini"
                                  v-model="tree.name"
                                  :minlength="1"
                                  @keyup.enter.native="doRenameTree"
                                  @focusout.native="doRenameTree"
                                  :style="renameTreeInputStyle(tree.id)"/>
                        <span v-else>{{ tree.name }}</span>
                    </div>
                </el-table-column>
            </el-table>
        </el-scrollbar>
        <context-menu ref="menu" :items="menuItems"/>
        <archetypes-dialog ref="dialog" :data="archetypes" @select="doCreateTree"/>
    </div>
</template>

<script>
import {ipcRenderer} from 'electron'
import ContextMenu from './ContextMenu'
import ArchetypesDialog from "./ArchetypesDialog";

export default {
    name: "TreeList",
    components: {ArchetypesDialog, ContextMenu},
    props: {
        archetypes: Array
    },
    data() {
        return {
            tableHeight: "100%",
            allTrees: null,
            visibleTrees: null,
            selectedTree: null,
            maxTreeId: 0,
            keyword: "",
            renameTree: false,
            mappedTrees: new Map(),
            menuItems: []
        }
    },
    async created() {
        await this.loadTrees();
        ipcRenderer.on("create-tree", this.createTree);
        ipcRenderer.on("open-workspace-path", this.openWorkspacePath);
        this.$events.$on("delete-tree", this.deleteTree);
    },
    mounted() {
        this.resizeObserver = new ResizeObserver(this.doLayout);
        this.resizeObserver.observe(this.$refs.body);
    },
    destroyed() {
        this.$events.$off("delete-tree", this.deleteTree);
        this.resizeObserver.disconnect();
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
                tree.id = ++this.maxTreeId;
                tree.renaming = false;
                this.mappedTrees.set(tree.name.toLowerCase(), tree);
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
            this.$set(tree, "nodeIdShown", false);

            this.$utils.visitNodes(tree.root, (node, parent) => {
                this.$utils.initNode(tree, node, parent);
            });

            this.$events.$emit("init-tree", tree.root);
        },
        onContextMenu(event, tree) {
            event.stopPropagation();

            this.menuItems.splice(0, this.menuItems.length);
            this.menuItems.push({title: '创建行为树', handler: this.createTree});
            if (tree != null) {
                this.menuItems.push({title: '删除行为树', handler: () => this.deleteTree(tree)});
                this.menuItems.push({title: '重命名行为树', handler: this.showRenameTreeInput});
            }
            this.menuItems.push({title: '打开工作目录', handler: () => this.openWorkspacePath(tree?.name)});

            this.$refs.menu.show(event.clientX, event.clientY, this.$refs.body);
        },
        openWorkspacePath(treeName) {
            if (typeof treeName !== "string") {
                treeName = this.selectedTree?.name;
            }
            ipcRenderer.invoke("open-workspace-path", treeName);
        },
        createTree() {
            if (this.archetypes.length > 1) {
                this.$refs.dialog.open();
            } else {
                this.doCreateTree(this.archetypes[0]);
            }

        },
        doCreateTree(archetype) {
            let tree = {};
            tree.root = JSON.parse(JSON.stringify(archetype.tree));

            do {
                tree.id = ++this.maxTreeId;
                tree.name = "新建行为树-" + this.maxTreeId;
            } while (this.mappedTrees.has(tree.name.toLowerCase()))

            this.mappedTrees.set(tree.name.toLowerCase(), tree);
            this.allTrees.push(tree);

            this.$refs.table.setCurrentRow(tree);
            this.$utils.saveTree(tree);

            this.$nextTick(() => {
                let treeIdTag = this.$refs['treeIdTag-' + tree.id];
                let scrollbarWrap = this.$refs.scrollbar?.$refs.wrap;
                if (scrollbarWrap) {
                    scrollbarWrap.scrollTop = this.$utils.getOffsetY(treeIdTag) - 50;
                }
                this.showRenameTreeInput();
            });
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

            this.$refs.scrollbar.$refs.wrap.scrollTop = 0;

            await ipcRenderer.invoke("delete-tree", tree.name);
        },
        renameTreeInputStyle(treeId) {
            // noinspection JSUnresolvedVariable
            let treeIdTagWidth = this.$refs['treeIdTag-' + treeId].offsetWidth;
            return {width: "calc(100% - " + (treeIdTagWidth + 2) + "px)"}
        },
        async showRenameTreeInput() {
            this.renameTree = true;
            this.selectedTree.renaming = true;
            this.selectedTree.oldName = this.selectedTree.name;
            await this.$nextTick();
            this.$refs.renameTreeInput.focus();
        },
        async doRenameTree() {
            this.renameTree = false;
            let oldTreeName = this.selectedTree.oldName;
            let newTreeName = this.selectedTree.name;
            if (newTreeName.startsWith("_")) {
                this.selectedTree.renaming = false;
                return;
            }
            let sameNameTree = this.mappedTrees.get(newTreeName.toLocaleString());
            if (sameNameTree && sameNameTree.id !== this.selectedTree.id) {
                this.selectedTree.name = oldTreeName;
                this.selectedTree.renaming = false;
                return;
            }
            if (oldTreeName !== newTreeName) {
                this.mappedTrees.delete(oldTreeName.toLocaleString());
                this.mappedTrees.set(newTreeName.toLocaleString(), this.selectedTree);
                await ipcRenderer.invoke("rename-tree", oldTreeName, newTreeName);
                this.selectedTree.renaming = false;
            }
        },
        async doLayout() {
            let body = document.querySelector("#body");
            let search = document.querySelector("#search");
            this.tableHeight = (body.offsetHeight - search.offsetHeight) + "px";
            await this.$nextTick();
            this.$refs.scrollbar.update();
            this.$refs.table.doLayout();
        }
    }
}
</script>

<style scoped>
#body {
    --border: solid #ebeef5 1px;
    height: 100%;
    width: 100%;
    border: var(--border);
}

#search {
    border-bottom: var(--border);
    padding: 8px 10px
}

.el-scrollbar >>> .el-scrollbar__wrap {
    overflow-x: hidden;
}

.el-table:before {
    content: none;
}

>>> .el-table__empty-block {
    margin-top: 40vh;
}

</style>