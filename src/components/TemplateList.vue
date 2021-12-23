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
                          style="margin-top: 1px"
                          placeholder="输入关键字搜索"
                          suffix-icon="el-icon-search">
                    <el-select slot="prepend"
                               popper-class="template-select-dropdown"
                               v-model="selectedType">
                        <el-option label="全部" value="all"></el-option>
                        <el-option v-for="type in visibleTemplateTypes"
                                   :key="type.id"
                                   :label="type.name"
                                   :value="type.id"/>

                    </el-select>
                </el-input>
            </template>
            <template #default="{row:template}">
                <div class="template" @mousedown.left="event=>selectTemplate(event,template)">
                    <el-tooltip effect="light"
                                :disabled="!template.desc"
                                :popper-class="templateTooltipClass(template)"
                                placement="bottom-start">
                        <template #content>
                            <span v-for="(line,i) in template.desc.split('\n')"
                                  :key="'line-'+i"
                                  style="height: 20px;line-height: 20px">
                                <br v-if="i>0"/>{{ line }}
                            </span>
                        </template>
                        <el-tag size="small"
                                style="cursor: default;"
                                @mousedown.native.stop>
                            {{ template.id }}
                        </el-tag>
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
        templates: Array,
        templateTypes: Array
    },
    data() {
        return {
            visibleTemplates: [],
            visibleTemplateTypes: [],
            mappedTemplates: new Map(),
            selectedType: null,
            keyword: null
        }
    },
    async created() {
        for (let templateType of this.templateTypes) {
            templateType.visible = false;
            //可以作为子节点的模板才显示在模板列表界面
            if (this.templateTypes.find(t => t.childrenTypes.indexOf(templateType.id) >= 0)) {
                templateType.visible = true;
                this.visibleTemplateTypes.push(templateType);
            }
        }
        for (let template of this.templates) {
            template.type = this.templateTypes.find(type => type.id === template.type);
        }
        for (const template of this.templates) {
            this.mappedTemplates.set(template.id, template);
        }

        this.selectedType = "all";
        this.keyword = "1";

        this.$events.$on("init-tree", this.onInitTree);
    },
    destroyed() {
        this.$events.$off("init-tree", this.onInitTree);
    },
    watch: {
        keyword() {
            this.visibleTemplates = this.templates.filter(template => {
                if (typeof this.selectedType === 'number' && template.type.id !== this.selectedType) {
                    return false;
                }
                return template.type.visible && (template.name.includes(this.keyword) || template.id.toString().includes(this.keyword));
            });
        },
        selectedType() {
            this.visibleTemplates = this.templates.filter(template => {
                if (typeof this.selectedType === 'number' && template.type.id !== this.selectedType) {
                    return false;
                }
                return template.type.visible && (template.name.includes(this.keyword) || template.id.toString().includes(this.keyword));
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
        },
        filterVisibleTemplates() {
            this.visibleTemplates = this.templates.filter(template => {
                if (typeof this.selectedType === 'number' && template.type.id !== this.selectedType) {
                    return false;
                }
                return template.type.visible && (template.name.includes(this.keyword) || template.id.toString().includes(this.keyword));
            });
        },
        templateTooltipClass(template) {
            let result = "template-tooltip";
            if (template.desc.split('\n').length > 1) {
                result += "-multi-line"
            } else {
                result += "-single-line"
            }

            return result;
        }
    }
}
</script>


<!--suppress CssUnusedSymbol -->
<style scoped>
.template {
    padding: 10px 0;
    cursor: grab;
    user-select: none;
}

.el-input >>> .el-input-group__prepend {
    background-color: #fff;
    width: 46px;
}

</style>
<!--suppress CssUnusedSymbol -->
<style>
.template-tooltip-single-line {
    transform: translateY(-7px);
    padding: 2px 10px;
}

.template-tooltip-multi-line {
    transform: translateY(-7px);
    padding: 7px 13px;
}

.template-select-dropdown {
    transform: translateY(-8px);
}

.template-select-dropdown .popper__arrow {
    left: 10px !important;
}

.template-select-dropdown .el-select-dropdown__item {
    height: 30px;
    line-height: 30px;
}
</style>