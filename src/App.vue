<template>
    <div id="app">
        <tree-editor/>
    </div>
</template>

<script>
import TreeEditor from './components/TreeEditor.vue'
import {ipcRenderer} from "electron";

export default {
    name: 'App',
    components: {
        TreeEditor
    },
    async mounted() {
        document.title = await ipcRenderer.invoke("title");
    }
}
</script>

<style>
</style>
