<template>
    <el-dialog title="选择调试目标"
               tooltip-effect="light"
               :append-to-body="true"
               :visible.sync="visible">
        <el-input v-model="baseUrl" :clearable="true" placeholder="请输入目标地址" #append>
            <el-button icon="el-icon-refresh" @click="queryList1"/>
        </el-input>
        <div class="body">
            <div class="left">
                <el-input class="keyword"
                          v-model="keyword1"
                          :clearable="true"
                          placeholder="输入关键字搜索"/>
                <el-scrollbar>
                    <el-table ref="table1"
                              size="mini"
                              :data="visibleRows1"
                              :cell-style="{'padding-left':'5px'}"
                              tooltip-effect="light"
                              highlight-current-row
                              @current-change="onSelectTarget1">
                        <template v-if="list1[0]">
                            <el-table-column prop="id"
                                             min-width="50"
                                             :label="list1[0].id.toString()"
                                             :show-overflow-tooltip="true"/>
                            <el-table-column prop="name"
                                             min-width="80"
                                             :label="list1[0].name.toString()"
                                             :show-overflow-tooltip="true"/>
                        </template>
                    </el-table>
                </el-scrollbar>
            </div>
            <div class="right">
                <el-input class="keyword"
                          v-model="keyword2"
                          :clearable="true"
                          placeholder="输入关键字搜索"/>
                <el-scrollbar>
                    <el-table ref="table2"
                              size="mini"
                              :data="visibleRows2"
                              :cell-style="{'padding-left':'5px'}"
                              tooltip-effect="light"
                              highlight-current-row
                              @current-change="onSelectTarget2">
                        <template v-if="list2[0]">
                            <el-table-column prop="id"
                                             min-width="50"
                                             :label="list2[0].id.toString()"
                                             :show-overflow-tooltip="true"/>
                            <el-table-column prop="name"
                                             min-width="80"
                                             :label="list2[0].name.toString()"
                                             :show-overflow-tooltip="true"/>
                            <el-table-column prop="tree.name"
                                             min-width="70"
                                             :label="list2[0].tree.name.toString()"
                                             :show-overflow-tooltip="true"/>

                        </template>
                    </el-table>
                </el-scrollbar>
            </div>
        </div>
        <div class="footer">
            <el-button size="small" @click="confirmSelect">确认</el-button>
            <el-button size="small" @click="visible=false">取消</el-button>
        </div>
    </el-dialog>
</template>

<script>

export default {
    name: "DebugSelector",
    data() {
        return {
            visible: false,
            baseUrl: "",
            list1: [],
            list2: [],
            visibleRows1: [],
            visibleRows2: [],
            target1: null,
            target2: null,
            keyword1: "",
            keyword2: ""
        }
    },
    inject:["treeList"],
    created() {
        this.baseUrl = localStorage.getItem("debugBaseUrl") || "";
    },
    watch: {
        keyword1(value) {
            this.visibleRows1 = this.list1.filter((row, index) => {
                if (index === 0) {
                    return false
                }
                return row === this.target1 || row.id?.toString()?.includes(value) || row.name?.toString()?.includes(value);
            });
        },
        keyword2(value) {
            this.visibleRows2 = this.list2.filter((row, index) => {
                if (index === 0) {
                    return false
                }
                return row === this.target2 || row.id?.toString()?.includes(value) || row.name?.toString()?.includes(value) || row.tree?.name?.toString()?.includes(value);
            });
        },
        visible(value) {
            if (value && this.baseUrl) {
                this.queryList1();
            }
        },
    },
    methods: {
        async queryList1() {
            let url = "list1"

            try {
                this.list1 = await this.$request.create(this.baseUrl).get(url)

                this.target1 = null;
                this.target2 = null;
                localStorage.setItem("debugBaseUrl", this.baseUrl);

                this.keyword1 = "";
                this.visibleRows1 = this.list1.slice(1);
                if (this.visibleRows1.length) {
                    this.$refs.table1.setCurrentRow(this.visibleRows1[0]);
                }
            } catch (e) {
                this.$logger.error(e);
                this.$msg(`请求[${this.baseUrl}/${url}]出错`, "error");
            }
        },
        async queryList2() {
            let url = `list2?id1=${this.target1.id}`;

            try {
                this.list2 = await this.$request.create(this.baseUrl).get(url)
                this.keyword2 = "";
                this.visibleRows2 = this.list2.slice(1);
                if (this.visibleRows2.length) {
                    this.$refs.table2.setCurrentRow(this.visibleRows2[0]);
                }
            } catch (e) {
                this.$logger.error(e);
                this.$msg(`请求[${this.baseUrl}/${url}]出错`, "error");
            }
        },
        onSelectTarget1(target1) {
            if (target1 !== this.target1) {
                this.target1 = target1;
                this.target2 = null;
                this.queryList2();
            }
        },
        onSelectTarget2(target2) {
            this.target2 = target2;
        },
        confirmSelect() {
            if (!(this.target1?.id && this.target2?.id && this.target2?.tree?.name)) {
                this.$msg("调试目标不合法", "error");
                this.$logger.error(`调试目标不合法,target1:${JSON.stringify(this.target1)},target2:${JSON.stringify(this.target2)}`);
                return;
            }

            if (this.treeList.setDebugTree(this.target2.tree)) {
                this.visible = false;
                this.$emit("select", this.baseUrl, this.target1, this.target2);
            }
        },
    }
}
</script>

<style scoped>
>>> .el-dialog {
    width: 952px;
    padding: 5px 25px;
    margin-bottom: 0;
}

>>> .el-dialog__body {
    padding-top: 15px;
    padding-bottom: 20px;
}

.body {
    position: relative;
    height: 400px;
    margin: 20px 0;
}

.left, .right {
    position: absolute;
    width: 48%;
}

.right {
    left: 52%;
}

>>> .keyword input {
    border-radius: 0;
    border: solid #ebeef5 1px;
}

.el-scrollbar {
    height: 360px;
    --border: solid #ebeef5 1px;
    border-left: var(--border);
    border-right: var(--border);
    border-bottom: var(--border);
}

.el-scrollbar >>> .el-scrollbar__wrap {
    overflow-x: hidden;
}

.el-table::before {
    content: none;
}

>>> .el-table__empty-block {
    margin: 140px 0;
}

.footer {
    position: relative;
    height: 30px;
}

.footer .el-button {
    float: right;
    margin-left: 25px;
}

</style>