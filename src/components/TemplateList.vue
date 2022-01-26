<template>
    <div id="body">
        <div id="search">
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
        </div>
        <el-scrollbar ref="scrollbar" :style="{height: tableHeight}">
            <el-table ref="table"
                      size="medium"
                      :show-header="false"
                      :data="visibleTemplates"
                      :row-key="templateKey"
                      :expand-row-keys="expandedTemplates"
                      @expand-change="onExpandChange"
                      tooltip-effect="light"
                      :cell-style="{padding:0}">
                <el-table-column type="expand"
                                 width="26px"
                                 #default="{row:template}">
                    <div class="template-expand">
                        <el-tooltip effect="light"
                                    :arrowOffset="1"
                                    :hide-after="600"
                                    popper-class="tooltip"
                                    placement="bottom-start"
                                    content="模板ID">
                            <el-tag size="small" class="template-tag">
                                {{ template.id }}
                            </el-tag>
                        </el-tooltip>
                        <el-tooltip v-if="template.type"
                                    effect="light"
                                    :arrowOffset="1"
                                    :hide-after="600"
                                    popper-class="tooltip"
                                    placement="bottom-start"
                                    content="模板类型">
                            <el-tag size="small" class="template-tag">
                                {{ template.type.name }}
                            </el-tag>
                        </el-tooltip>
                        <el-tooltip v-if="template.group"
                                    effect="light"
                                    :arrowOffset="1"
                                    :hide-after="600"
                                    placement="bottom-start"
                                    popper-class="tooltip"
                                    content="模板组">
                            <el-tag size="small" class="template-tag">
                                {{ mappedTemplateGroups.get(template.group).name }}
                            </el-tag>
                        </el-tooltip>
                        <div style="margin-top: 8px;user-select: text">
                            {{ template.desc }}
                        </div>
                    </div>
                </el-table-column>
                <el-table-column :show-overflow-tooltip="true"
                                 #default="{row:template}">
                    <div :ref="'templateName-'+template.id"
                         class="template-name"
                         @mousedown.left="selectTemplate($event,template)">
                        {{ template.name }}
                    </div>
                </el-table-column>
            </el-table>
        </el-scrollbar>
    </div>
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
            tableHeight: "100%",
            visibleTemplates: [],
            mappedTemplateTypes: new Map(),
            mappedTemplateGroups: new Map(),
            mappedTemplates: new Map(),
            selectGroups: [],
            selectedGroup: -1,
            hasUngrouped: false,
            keyword: null,
            expandedTemplates: []
        }
    },
    created() {
        this.keyword = "";

        this.initTemplateTypes();
        this.initTemplates();
        this.initSelectGroups();

        this.$events.$on("init-tree", this.onInitTree);
        this.$events.$on("position-template", this.positionTemplate);
    },
    mounted() {
        this.resizeObserver = new ResizeObserver(this.doLayout);
        this.resizeObserver.observe(document.querySelector("#body"));
        this.blurGroupSelectInput();
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
        initTemplateTypes() {
            if (!this.templateTypes) {
                return
            }
            for (let templateType of this.templateTypes) {
                this.mappedTemplateTypes.set(templateType.id, templateType);
                //可以作为子节点的模板才显示在模板列表界面
                templateType.visible = undefined !== this.templateTypes.find(t => t.childrenTypes.indexOf(templateType.id) >= 0);
            }
        },
        initTemplates() {
            this.templates.sort((t1, t2) => {
                if (typeof t1.id === "number" && typeof t2.id === "number") {
                    return t1.id - t2.id;
                }
                if (typeof t1.id === "number") {
                    return -1;
                }
                if (typeof t2.id === "number") {
                    return 1;
                }
                return t1.id.localeCompare(t2.id);
            });

            for (let template of this.templates) {
                this.mappedTemplates.set(template.id, template);

                if (typeof template.type !== "number") {
                    continue
                }

                template.type = this.mappedTemplateTypes.get(template.type);
                if (template.childrenTypes) {
                    for (let childrenType of template.childrenTypes) {
                        this.mappedTemplateTypes.get(childrenType).visible = true;
                    }
                } else {
                    template.childrenTypes = template.type.childrenTypes;
                }

                if (template.childrenNum === undefined) {
                    template.childrenNum = template.type.childrenNum;
                }

                if (template.comment === undefined) {
                    if (template.type.comment === undefined) {
                        template.comment = true;
                    } else {
                        template.comment = template.type.comment;
                    }
                }
            }

            if (this.templateTypes) {
                for (let template of this.templates) {
                    if (template.childrenIds) {
                        for (let childId of template.childrenIds) {
                            this.mappedTemplates.get(childId).type.visible = true;
                        }
                    }
                }
            }
            for (let template of this.templates) {
                template.visible = true;
                if (template.type) {
                    template.visible = template.type.visible;
                }
                if (template.visible && !template.group) {
                    this.hasUngrouped = true;
                }
            }
        },
        initSelectGroups() {
            if (this.templateGroups?.length) {
                this.selectGroups.push({id: -1, name: "全部分组"});
                for (let templateGroup of this.templateGroups) {
                    this.mappedTemplateGroups.set(templateGroup.id, templateGroup);
                    this.selectGroups.push(templateGroup);
                }
                if (this.hasUngrouped) {
                    this.selectGroups.push({id: -2, name: "未分组"});
                }
            } else if (this.templateTypes?.length) {
                this.selectGroups.push({id: -1, name: "全部类型"});
                for (let templateType of this.templateTypes) {
                    if (templateType.visible) {
                        this.selectGroups.push(templateType);
                    }
                }
                if (this.selectGroups.length === 1) {
                    this.selectGroups.pop();
                }
            }
        },
        selectTemplate(event, template) {
            this.$emit("select-template", {x: event.clientX, y: event.clientY, template});
        },
        onInitTree(root) {
            this.$utils.visitNodes(root, node => {
                this.$set(node, "template", this.mappedTemplates.get(node.tid));
            });
        },
        filterTemplates() {
            this.visibleTemplates = this.templates.filter(template => {
                if (!template.visible) {
                    return false;
                }
                if (this.templateGroups?.length) {
                    //按模板组搜索
                    if (this.selectedGroup > 0 && template.group !== this.selectedGroup) {
                        return false;
                    }
                    if (this.selectedGroup === -2 && template.group) {
                        return false;
                    }
                } else if (this.templateTypes?.length && this.selectedGroup > 0 && template.type.id !== this.selectedGroup) {
                    //按模板类型搜索
                    return false;
                }

                return template.name.includes(this.keyword) || template.id.toString().includes(this.keyword);
            });
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
        },
        async doLayout() {
            let body = document.querySelector("#body");
            let search = document.querySelector("#search");
            this.tableHeight = (body.offsetHeight - search.offsetHeight) + "px";
            await this.$nextTick();
            this.$refs.scrollbar.update();
            this.$refs.table.doLayout();
        },
        templateKey(template) {
            return template.id;
        },
        onExpandChange(template) {
            if (this.expandedTemplates.length > 0) {
                if (this.expandedTemplates.includes(template.id)) {
                    this.expandedTemplates.pop();
                } else {
                    this.expandedTemplates.pop();
                    this.expandedTemplates.push(template.id);
                }
            } else {
                this.expandedTemplates.push(template.id);
            }
        },
        async positionTemplate(tid) {
            this.selectedGroup = -1;
            this.expandedTemplates.pop();
            this.expandedTemplates.push(tid);
            await this.$nextTick();
            let templatePosition = this.$utils.getOffsetY(this.$refs["templateName-" + tid]);
            let scrollbarWrap = this.$refs.scrollbar.$refs.wrap;
            let searchHeight = document.querySelector("#search").offsetHeight;
            scrollbarWrap.scrollTop = templatePosition - searchHeight;
        },
    }
}
</script>

<style scoped>
#body {
    --border: solid #ebeef5 1px;
    height: 100%;
    width: 100%;
    border: var(--border);
}

#search {
    border-bottom: var(--border);
    padding: 8px 10px
}

.el-scrollbar >>> .el-scrollbar__wrap {
    overflow-x: hidden;
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

.el-table >>> .cell {
    padding-left: 0;
    padding-right: 0;
}

.el-table:before {
    content: none;
}

>>> .el-table__empty-block {
    margin-top: 40vh;
}

>>> .el-table__expand-icon--expanded {
    transform: rotate(-90deg);
}

>>> .el-table__expand-icon:not(.el-table__expand-icon--expanded) {
    transform: rotate(90deg);
}

.template-expand {
    padding: 2px 10px 0 26px;
    line-height: 22px;
}


.template-tag {
    margin-right: 5px;
}

.template-name {
    padding: 10px 0;
    margin-right: 5px;
    user-select: none;
    overflow-x: hidden;
    text-overflow: ellipsis;
}

</style>
<style>

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