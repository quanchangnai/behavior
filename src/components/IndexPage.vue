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
    name: 'IndexPage',
    components: {
        TreeEditor,
        RecentWorkspaces
    },
    created() {
        ipcRenderer.on("msg", (event, msg, type) => {
            this.$message({message: msg, type: type || "info", center: true, offset: 200});
        });
        ipcRenderer.on("recent-workspaces", (event, workspaces) => {
            this.$refs.recentWorkspaces.openDialog(workspaces);
        })
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
    transform: translateY(-7px);
}

[x-placement^="top"].tooltip {
    transform: translateY(7px);
}

[x-placement^="right"].tooltip {
    transform: translateX(-7px);
}

[x-placement^="left"].tooltip {
    transform: translateX(7px);
}
</style>
