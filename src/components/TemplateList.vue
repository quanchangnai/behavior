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

export default {
    name: "TemplateList",
    props: {
        templates: Array
    },
    data() {
        return {
            allTemplates: null,
            visibleTemplates: null,
            mappedTemplates: new Map(),
            keyword: ""
        }
    },
    async created() {
        this.visibleTemplates = this.templates;

        for (const template of this.templates) {
            this.mappedTemplates.set(template.id, template);
        }

        this.$events.$on("init-tree", this.onInitTree);
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
        },
        onInitTree(tree) {
            let init = node => {
                this.$set(node, "template", this.mappedTemplates.get(node.tid));
                for (let child of node.children) {
                    init(child);
                }
            };

            init(tree.root);
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