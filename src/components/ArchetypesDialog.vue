<template>
    <el-dialog top="25vh"
               :width="width()"
               title="选择原型"
               @opened="onOpened"
               :visible.sync="visible">
        <el-table ref="table"
                  size="small"
                  max-height="201px"
                  :data="data"
                  :show-header="false"
                  highlight-current-row
                  @select="(s,r)=>this.select(r)"
                  @current-change="select">
            <el-table-column type="selection"
                             align="center"
                             width="120px"/>
            <el-table-column #default="{row}">
                <span style="margin-left: 20px"> {{ row.name }}</span>
            </el-table-column>
        </el-table>
        <span slot="footer">
                <el-button size="medium" @click="close">取消</el-button>
                <el-button type="primary" size="medium" @click="finishSelect">创建</el-button>
            </span>
    </el-dialog>
</template>

<script>
export default {
    name: "ArchetypesDialog",
    props: {
        data: Array
    },
    data() {
        return {
            visible: false,
            selectedArchetype: null
        }
    },
    methods: {
        width() {
            if (this.data.length > 2) {
                return "520px";
            } else {
                return "450px";
            }
        },
        open() {
            this.visible = true;
        },
        close() {
            this.visible = false;
        },
        onOpened() {
            this.$refs.table.setCurrentRow(this.selectedArchetype || this.data[0]);
        },
        select(archetype) {
            this.selectedArchetype = archetype;
            this.$refs.table.clearSelection();
            this.$refs.table.toggleRowSelection(archetype);
            this.$refs.table.setCurrentRow(archetype);
        },
        finishSelect() {
            this.close();
            this.$emit("select", this.selectedArchetype)
        },
    }
}
</script>

<!--suppress CssUnusedSymbol -->
<style scoped>
.el-table {
    --border: solid #ebeef5 1px;
    border-top: var(--border);
    border-left: var(--border);
    border-right: var(--border);
}
</style>