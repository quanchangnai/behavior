<template>
    <div id="app">
        <tree-editor/>
    </div>
</template>

<script>
import TreeEditor from '../components/TreeEditor.vue'
import {ipcRenderer} from "electron";

export default {
    name: 'Index',
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
