<template>
    <div class="debug-bar" v-show="isDebugging()">
        <el-tooltip v-for="(tool,index) in tools"
                    :key="'debug-tool-'+index"
                    effect="light"
                    :arrowOffset="1"
                    :hide-after="600"
                    popper-class="tooltip"
                    placement="bottom-start"
                    :content="tool.tip">
            <span :class="tool.icon" @click="tool.handle"/>
        </el-tooltip>
        <debug-selector ref="debugSelector" @select="onSelectTarget"/>
    </div>
</template>

<script>
import {ipcRenderer} from "electron";
import DebugSelector from "@/components/DebugSelector.vue";

export default {
    name: "DebugBar",
    components: {DebugSelector},
    data() {
        return {
            tree: null,//当前行为树
            nodes: null,//节点ID:节点
            baseUrl: "",
            target1: null,
            target2: null,
            records: [],
            step: 0,
            playId: 0,
        }
    },
    created() {
        ipcRenderer.on("toggle-debug", this.toggleDebug);
        ipcRenderer.on("next-step", this.nextStep);
        ipcRenderer.on("next-frame", this.nextFrame);
        ipcRenderer.on("play-pause", this.playPause);
    },
    computed: {
        tools() {
            return [
                {tip: "下一步", icon: "el-icon-arrow-right", handle: this.nextStep},
                {tip: "下一帧", icon: "el-icon-d-arrow-right", handle: this.nextFrame},
                {
                    tip: this.playId > 0 ? '暂停' : '播放',
                    icon: this.playId > 0 ? 'el-icon-video-pause' : 'el-icon-video-play',
                    handle: this.playPause
                },
                {tip: "停止调试", icon: "el-icon-circle-close", handle: this.toggleDebug},
                {tip: "选择调试目标", icon: "el-icon-setting", handle: () => this.showDebugSelector()},
            ]
        }
    },
    methods: {
        toggleDebug() {
            if (this.isDebugging()) {
                this.stopDebug();
            } else {
                this.showDebugSelector();
            }
        },
        async startDebug() {
            this.nodes = new Map();
            this.$utils.visitSubtree(this.tree.root, node => this.nodes.set(node.id, node));
            this.step = 0;

            await this.fetchRecords();
            this.setNodeRunning(true);
        },
        stopDebug() {
            this.pause();
            this.setNodeRunning(false);
            this.nodes = null;
            this.records = [];
            this.step = 0;
            this.showDebugSelector(false);
        },
        onSelectTree(tree) {
            if (this.isDebugging() && this.tree !== tree) {
                this.stopDebug();
            }

            this.tree = tree;
        },
        onSelectTarget(baseUrl, target1, target2) {
            if (this.isDebugging()) {
                this.stopDebug();
            }

            if (this.tree) {
                this.baseUrl = baseUrl;
                this.target1 = target1;
                this.target2 = target2;
                this.startDebug();
            } else {
                this.$msg(`工作区中不存在目标行为树[${target2.tree}]`, "warning");
            }
        },
        async fetchRecords() {
            let url = `records?id1=${this.target1.id}&id2=${this.target2.id}`;
            try {
                let records = await this.$request.create(this.baseUrl).get(url)
                if (this.isDebugging()) {
                    this.records.push(...records);
                }
            } catch (e) {
                this.$logger.error(e);
                this.$msg(`请求[${this.baseUrl}/${url}]出错`, "error");
                this.playPause();
            }
        },
        isDebugging() {
            return this.tree && this.nodes?.size > 0;
        },
        setNodeRunning(running) {
            if (!this.isDebugging()) {
                return;
            }

            if (this.records.length < 1) {
                this.pause();
                return;
            }

            try {
                let nodeId = this.records[0][this.step].nodeId;
                this.nodes.get(nodeId).running = running;
            } catch (e) {
                this.$logger.error(e)
                this.$msg("调试出错，运行记录和行为树不匹配", "error");
                this.pause();
            }
        },
        nextFrame() {
            if (!this.isDebugging()) {
                return;
            }
            if (this.records.length <= 1) {
                return;
            } else if (this.records.length < 10) {
                this.fetchRecords();
            }

            this.setNodeRunning(false);
            this.records.shift();
            this.step = 0;
            this.setNodeRunning(true);
        },
        nextStep() {
            if (!this.isDebugging()) {
                return
            }

            if (this.step < this.records[0].length - 1) {
                this.setNodeRunning(false);
                this.step++;
                this.setNodeRunning(true);
            } else if (this.records.length > 1) {
                this.nextFrame();
            } else {
                this.pause();
            }
        },
        pause() {
            if (this.playId > 0) {
                this.playPause();
            }
        },
        playPause() {
            if (!this.isDebugging()) {
                return
            }

            if (this.playId > 0) {
                clearInterval(this.playId);
                this.playId = 0;
            } else {
                this.playId = setInterval(this.nextStep, 200);
            }
        },
        showDebugSelector(show = true) {
            this.$refs.debugSelector.visible = show;
        },
    }
}
</script>

<style scoped>
.debug-bar {
    position: absolute;
    right: 20px;
    top: 12px;
    z-index: 100;
}

.debug-bar span {
    font-size: 20px;
    margin-left: 10px
}

.debug-bar span:hover {
    color: #409EFF;
}
</style>