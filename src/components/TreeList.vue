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
                      @current-change="selectTree"
                      @row-dblclick="showEditTreeNameInput"
                      @row-contextmenu="(r,c,e)=>onContextMenu(e,r)">
                <template #empty>
                    <el-button type="text" @click="createTree">
                        创建行为树&nbsp;&nbsp;&nbsp;&nbsp;
                    </el-button>
                </template>
                <el-table-column #default="{row:tree}">
                    <div>
                        <span :ref="'treeIdTag-'+tree.id">
                            <el-tag size="small" style="margin-right: 10px;">{{ tree.id }}</el-tag>
                        </span>
                        <el-input v-if="editTreeName&&tree===selectedTree"
                                  ref="editTreeNameInput"
                                  size="mini"
                                  v-model="tree.name"
                                  :minlength="1"
                                  :maxlength="10"
                                  @focusout.native="editTreeName=false"
                                  :style="editTreeNameInputStyle(tree.id)"/>
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
            }
            this.menuItems.push({title: '打开工作目录', handler: () => ipcRenderer.invoke("open-workspace-path")});

            let body = this.$refs.body;
            let limits = {
                x: this.$utils.getClientX(body),
                y: this.$utils.getClientY(body),
                width: body.offsetWidth,
                height: body.offsetHeight,
            };
            this.$refs.menu.show(event.clientX, event.clientY, limits);
        },
        createTree() {
            if (this.archetypes.length > 1) {
                this.$refs.dialog.open();
            } else {
                this.doCreateTree(this.archetypes[0]);
            }

        },
        doCreateTree(archetype) {
            let tree = JSON.parse(JSON.stringify(archetype));
            tree.id = ++this.maxTreeId;
            tree.name = "新建行为树-" + this.maxTreeId;

            this.allTrees.push(tree);
            this.$refs.table.setCurrentRow(tree);

            this.$utils.saveTree(tree);
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