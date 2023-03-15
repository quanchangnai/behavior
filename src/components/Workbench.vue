<template>
    <div>
        <tree-editor/>
        <recent-workspaces ref="recentWorkspaces"/>
    </div>
</template>

<script>
import TreeEditor from './TreeEditor.vue'
import RecentWorkspaces from './RecentWorkspaces.vue'
import {ipcRenderer} from "electron";

export default {
    name: 'Workbench',
    components: {
        TreeEditor,
        RecentWorkspaces
    },
    created() {
        ipcRenderer.on("msg", (event, msg, type) => this.$msg(msg, type));
        ipcRenderer.on("recent-workspaces", (event, workspaces) => {
            this.$refs.recentWorkspaces.openDialog(workspaces);
        });
    },
    async mounted() {
        ipcRenderer.on("title", (event, title) => document.title = title);
        ipcRenderer.send("title");
    }
}
</script>

<style>

.el-table__body-wrapper::-webkit-scrollbar {
    width: 18px;
}

.el-table__body-wrapper::-webkit-scrollbar-thumb {
    border-radius: 8px;
    background-color: #f5f7fa;
    box-shadow: inset 0 0 4px #8c939d;
}

.el-table__body-wrapper::-webkit-scrollbar-track {
    background: #ffffff;
}

.tooltip {
    padding: 5px 10px;
    box-sizing: border-box;
    line-height: 20px;
}

[x-placement^="bottom"].tooltip {
    margin-top: 6px;
}

[x-placement^="top"].tooltip {
    margin-bottom: 5px;
}

[x-placement^="right"].tooltip {
    margin-left: 6px;
}

[x-placement^="left"].tooltip {
    margin-right: 5px;
}
</style>
