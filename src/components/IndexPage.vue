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
</style>
