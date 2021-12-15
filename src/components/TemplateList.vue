<template>
    <el-table border
              size="medium"
              :height="'100%'"
              :data="visibleTemplates"
              :cell-style="{padding:0}">
        <el-table-column>
            <template #header>
                <el-input v-model="keyword"
                          clearable
                          size="medium"
                          placeholder="输入关键字搜索"
                          prefix-icon="el-icon-search"/>
            </template>
            <template #default="{row:template}">
                <div class="template" @mousedown="event=>onTemplateSelect(event,template)"> {{ template.name }}</div>
            </template>
        </el-table-column>
    </el-table>
</template>

<script>
import {ipcRenderer} from "electron";

export default {
    name: "TemplateList",
    async mounted() {
        this.allTemplates = await ipcRenderer.invoke("load-templates");
        this.visibleTemplates = this.allTemplates;
    },
    data() {
        return {
            allTemplates: null,
            visibleTemplates: null,
            keyword: ""
        }
    },
    watch: {
        keyword(value) {
            this.visibleTemplates = this.allTemplates.filter(template => {
                return template.name.includes(value);
            });
        }
    },
    methods: {
        onTemplateSelect(event, template) {
            this.$emit("template-select", {x: event.clientX, y: event.clientY, template});
        }
    }
}
</script>

<style scoped>
.template {
    padding: 10px 0;
    cursor: grab;
    user-select: none;
}
</style>