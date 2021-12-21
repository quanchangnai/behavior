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
                          size="small"
                          placeholder="输入关键字搜索"
                          prefix-icon="el-icon-search"/>
            </template>
            <template #default="{row:template}">
                <div class="template" @mousedown.left="event=>selectTemplate(event,template)">
                    <el-tooltip effect="light"
                                :disabled="!template.desc"
                                placement="bottom-start"
                                :content="template.desc">
                        <el-tag size="small" style="cursor: default;" @mousedown.native.stop>{{ template.id }}</el-tag>
                    </el-tooltip>
                    {{ template.name }}
                </div>
            </template>
        </el-table-column>
    </el-table>
</template>

<script>

import utils from "@/utils";

export default {
    name: "TemplateList",
    props: {
        templates: Array
    },
    data() {
        return {
            visibleTemplates: [],
            mappedTemplates: new Map(),
            keyword: null
        }
    },
    async created() {
        for (const template of this.templates) {
            this.mappedTemplates.set(template.id, template);
        }

        this.keyword = "";

        this.$events.$on("init-tree", this.onInitTree);
    },
    destroyed() {
        this.$events.$off("init-tree", this.onInitTree);
    },
    watch: {
        keyword(value) {
            this.visibleTemplates = this.templates.filter(template => {
                return template.type.visible && (template.name.includes(value) || template.id.toString().includes(value));
            });
        }
    },
    methods: {
        selectTemplate(event, template) {
            this.$emit("select-template", {x: event.clientX, y: event.clientY, template});
        },
        onInitTree(tree) {
            utils.visitNodes(tree.root, node => {
                this.$set(node, "template", this.mappedTemplates.get(node.tid));
            });
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