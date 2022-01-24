<template>
    <el-dialog top="25vh"
               width="520px"
               title="管理工作区"
               tooltip-effect="light"
               :visible.sync="visible">
        <el-scrollbar ref="scrollbar" :style="{'height': height()}">
            <el-table ref="table"
                      size="small"
                      :data="workspaces"
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
        </el-scrollbar>
    </el-dialog>
</template>

<script>
import {ipcRenderer} from "electron";

export default {
    name: "WorkspacesDialog",
    data() {
        return {
            workspaces: [],
            visible: false
        }
    },
    methods: {
        height() {
            return Math.min(50 * this.workspaces.length, 197) + "px";
        },
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

.el-scrollbar >>> .el-scrollbar__wrap {
    overflow-x: hidden;
}

.el-table {
    --border: solid #ebeef5 1px;
    border-top: var(--border);
    border-left: var(--border);
    border-right: var(--border);
}
</style>