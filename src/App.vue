<template>
    <div id="app">
        <tree-editor/>
    </div>
</template>

<script>
import TreeEditor from './components/TreeEditor.vue'
import {ipcRenderer} from 'electron'

export default {
    name: 'App',
    components: {
        TreeEditor
    },
    mounted() {
        window.addEventListener("keydown", event => {
            if (event.code === "F12") {
                ipcRenderer.invoke("dev-tools");
            }
        })
    },
    methods: {}
}
</script>

<style>
</style>
