<template>
    <el-dialog top="25vh"
               width="520px"
               title="最近工作区"
               tooltip-effect="light"
               :visible.sync="visible">
        <el-scrollbar ref="scrollbar" :style="{'height': height()}">
            <el-table ref="table"
                      size="small"
                      :data="workspaces"
                      :show-header="false"
                      :show-overflow-tooltip="true"
                      highlight-current-row
                      @cell-dblclick="openWorkspace">
                <el-table-column #default="{row}">
                    <span> {{ row.path }}</span>
                </el-table-column>
                <el-table-column width="100" #default="{row,$index}">
                    <el-button type="text"
                               size="small"
                               @click="openWorkspace(row)">打开
                    </el-button>
                    <el-button type="text"
                               size="small"
                               :disabled="!row.deletable"
                               @click="deleteWorkspace(row,$index)">删除
                    </el-button>
                </el-table-column>
            </el-table>
        </el-scrollbar>
    </el-dialog>
</template>

<script>
import {ipcRenderer} from "electron";

export default {
    name: "RecentWorkspaces",
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
        openDialog(workspaces) {
            this.workspaces = workspaces;
            this.visible = true;
        },
        async openWorkspace(workspace) {
            await ipcRenderer.invoke("open-workspace", workspace.path);
            workspace.deletable = false;
        },
        async deleteWorkspace(workspace, index) {
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