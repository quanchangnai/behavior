<template>
    <tree-editor/>
</template>

<script>
import TreeEditor from './TreeEditor.vue'
import {ipcRenderer} from "electron";

export default {
    name: 'IndexPage',
    components: {
        TreeEditor
    },
    created() {
        ipcRenderer.on("msg", (event, msg, type) => {
            this.$message({message: msg, type: type || "info", center: true, offset: 200});
        });
    },
    async mounted() {
        document.title = await ipcRenderer.invoke("title");
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
</style>
