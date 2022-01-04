<template>
    <el-table border
              ref="table"
              size="medium"
              :height="'100%'"
              :data="visibleTemplates"
              :cell-style="{padding:0}">
        <el-table-column>
            <template #header>
                <el-input v-model="keyword"
                          clearable
                          size="small"
                          class="keyword-input"
                          :prefix-icon="selectGroups.length===0?'el-icon-search':''"
                          placeholder="输入关键字搜索">
                    <el-select slot="prepend"
                               class="group-select"
                               v-model="selectedGroup"
                               v-if="selectGroups.length>0"
                               popper-class="template-select-dropdown">
                        <el-option v-for="group in selectGroups"
                                   :key="group.id"
                                   :label="group.name"
                                   :value="group.id"/>

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
                                style="cursor: default;margin-right: 10px;"
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

export default {
    name: "TemplateList",
    props: {
        templates: Array,
        templateTypes: Array,
        templateGroups: Array
    },
    data() {
        return {
            visibleTemplates: [],
            mappedTemplates: new Map(),
            selectGroups: [],
            selectedGroup: -1,
            keyword: null
        }
    },
    created() {
        for (let templateType of this.templateTypes) {
            templateType.visible = false;
            //可以作为子节点的模板才显示在模板列表界面
            if (this.templateTypes.find(t => t.childrenTypes.indexOf(templateType.id) >= 0)) {
                templateType.visible = true;
            }
        }

        let ungrouped = false;
        for (let template of this.templates) {
            if (typeof template.type === "number") {
                template.type = this.templateTypes.find(type => type.id === template.type);
                if (template.nodeHasName === undefined) {
                    if (template.type.nodeHasName === undefined) {
                        template.nodeHasName = true;
                    } else {
                        template.nodeHasName = template.type.nodeHasName;
                    }
                }
            }
            if (template.type.visible && !template.group) {
                ungrouped = true;
            }
        }

        if (this.templateGroups && this.templateGroups.length) {
            this.selectGroups.push({id: -1, name: "全部分组"});
            for (let templateGroup of this.templateGroups) {
                this.selectGroups.push(templateGroup);
            }
            if (ungrouped) {
                this.selectGroups.push({id: -2, name: "未分组"});
            }
        }

        for (const template of this.templates) {
            this.mappedTemplates.set(template.id, template);
        }

        this.keyword = "";

        this.$events.$on("init-tree", this.onInitTree);

        this.blurGroupSelectInput();
    },
    mounted() {
        this.resizeObserver = new ResizeObserver(this.$refs.table.doLayout);
        this.resizeObserver.observe(this.$refs.table.$el);
    },
    destroyed() {
        this.$events.$off("init-tree", this.onInitTree);
        this.resizeObserver.disconnect();
    },
    watch: {
        keyword() {
            this.filterTemplates();
        },
        selectedGroup() {
            this.filterTemplates();
        }
    },
    methods: {
        selectTemplate(event, template) {
            this.$emit("select-template", {x: event.clientX, y: event.clientY, template});
        },
        onInitTree(tree) {
            this.$utils.visitNodes(tree.root, node => {
                this.$set(node, "template", this.mappedTemplates.get(node.tid));
            });
        },
        filterTemplates() {
            this.visibleTemplates = this.templates.filter(template => {
                if (!template.type.visible) {
                    return false;
                }
                if (this.selectedGroup > 0 && template.group !== this.selectedGroup) {
                    return false;
                }
                if (this.selectedGroup === -2 && template.group) {
                    return false;
                }
                return template.name.includes(this.keyword) || template.id.toString().includes(this.keyword);
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
        },
        async blurGroupSelectInput() {
            await this.$nextTick();
            let groupSelectInput = document.querySelector(".group-select .el-input__inner");
            if (groupSelectInput != null) {
                //focus会导致输入框text-overflow: ellipsis失效
                groupSelectInput.onfocus = () => {
                    groupSelectInput.blur();
                };
            }
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

.keyword-input {
    margin: 1px 0;
}

.keyword-input >>> .el-input-group__prepend {
    background-color: #fff;
    width: 50px;
}

.group-select >>> .el-input__inner {
    padding-left: 8px;
    padding-right: 22px;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
}

.group-select >>> .el-input__icon {
    width: 20px !important;
}


</style>
<!--suppress CssUnusedSymbol -->
<style>

.template-tooltip-single-line {
    transform: translateY(-8px);
    padding: 2px 10px;
}

.template-tooltip-multi-line {
    transform: translateY(-8px);
    padding: 7px 13px;
}

.template-select-dropdown {
    transform: translateY(-7px);
}

.template-select-dropdown .popper__arrow {
    left: 10px !important;
}

.template-select-dropdown .el-select-dropdown__item {
    height: 30px;
    line-height: 30px;
}
</style>