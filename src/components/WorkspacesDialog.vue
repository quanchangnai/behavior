<template>
    <el-dialog top="25vh"
               width="520px"
               title="管理工作区"
               tooltip-effect="light"
               :visible.sync="visible">
        <el-table ref="table"
                  size="small"
                  :data="workspaces"
                  max-height="201px"
                  :show-header="false"
                  :show-overflow-tooltip="true"
                  highlight-current-row>
            <el-table-column #default="{row}">
                <span> {{ row.path }}</span>
            </el-table-column>
            <el-table-column width="80" #default="{row,$index}">
                <el-button type="text"
                           size="small"
                           :disabled="!row.deletable"
                           @click="_delete(row,$index)">删除
                </el-button>
            </el-table-column>
        </el-table>
    </el-dialog>
</template>

<script>
import {ipcRenderer} from "electron";

export default {
    name: "WorkspacesDialog",
    props: {
        data: Array
    },
    data() {
        return {
            workspaces: [],
            visible: false
        }
    },
    methods: {
        open(workspaces) {
            this.workspaces = workspaces;
            this.visible = true;
        },
        async _delete(workspace, index) {
            await ipcRenderer.invoke("delete-workspace", workspace.path);
            this.workspaces.splice(index, 1)
        }
    }
}
</script>

<style scoped>
>>> .el-dialog {
    padding: 0 30px 30px 30px;
}

>>> .el-dialog__body {
    padding: 12px 22px
}

.el-table {
    --border: solid #ebeef5 1px;
    border-top: var(--border);
    border-left: var(--border);
    border-right: var(--border);
}
</style>