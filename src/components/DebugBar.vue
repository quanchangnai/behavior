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
            <span :class="tool.classes" @click="tool.handle"/>
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
            playing: false,
        }
    },
    created() {
        ipcRenderer.on("toggle-debug", this.toggleDebug);
        ipcRenderer.on("next-step", this.tryNextStep);
        ipcRenderer.on("next-frame", this.tryNextFrame);
        ipcRenderer.on("play-pause", this.playPause);
    },
    computed: {
        tools() {
            return [
                {
                    tip: "下一步",
                    classes: ["el-icon-arrow-right", this.playing ? "disabled" : "enabled"],
                    handle: this.tryNextStep
                },
                {
                    tip: "下一帧",
                    classes: ["el-icon-d-arrow-right", this.playing ? "disabled" : "enabled"],
                    handle: this.tryNextFrame
                },
                {
                    tip: this.playing ? '暂停' : '播放',
                    classes: this.playing ? 'el-icon-video-pause' : 'el-icon-video-play',
                    handle: this.playPause
                },
                {tip: "停止调试", classes: "el-icon-circle-close", handle: this.stopDebug},
                {tip: "选择调试目标", classes: "el-icon-setting", handle: () => this.showDebugSelector()},
            ]
        }
    },
    methods: {
        showDebugSelector(show = true) {
            this.$refs.debugSelector.visible = show;
        },
        toggleDebug() {
            if (this.isDebugging()) {
                this.stopDebug();
            } else {
                this.showDebugSelector();
            }
        },
        async startDebug() {
            if (this.isDebugging()) {
                return;
            }

            this.nodes = new Map();
            this.tree.debugging = true;
            this.tree.breakPointCount = 0;
            this.tree.enabledBreakPointCount = 0;

            this.$utils.visitSubtree(this.tree.root, node => {
                this.nodes.set(node.id, node);
                if (node.breakPointState !== 0) {
                    node.tree.breakPointCount++;
                    if (node.breakPointState > 0) {
                        node.tree.enabledBreakPointCount++;
                    }
                }
            });

            this.$forceUpdate();

            await this.fetchRecords();

            this.step = -1;
            this.playing = true;
            await this.nextStep();
        },
        stopDebug() {
            if (!this.isDebugging()) {
                return;
            }

            this.setNodeRunning(false);
            this.nodes = null;
            this.records = [];
            this.step = 0;
            this.playing = false;
            this.tree.debugging = false;
            this.showDebugSelector(false);
            this.$forceUpdate();
        },
        onSelectedTree(tree) {
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
                this.$msg(`工作区中不存在目标行为树[${target2.tree.name}]`, "error");
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
                this.playing = false;
            }
        },
        isDebugging() {
            return this.tree?.debugging && this.nodes?.size > 0;
        },
        setNodeRunning(running) {
            if (!this.isDebugging()) {
                return;
            }

            if (this.records.length < 1) {
                this.playing = false;
                return;
            }

            try {
                let record = this.records[0][this.step];
                let node = this.nodes.get(record.nodeId);
                node.running = running;
                node.context = running ? record.context : null;
            } catch (e) {
                this.$logger.error(e)
                this.$msg("调试出错，运行记录和行为树不匹配", "error");
                this.playing = false;
            }
        },
        tryNextFrame() {
            if (!this.playing) {
                this.nextFrame();
            }
        },
        tryNextStep() {
            if (!this.playing) {
                this.nextStep();
            }
        },
        async nextFrame() {
            if (!this.isDebugging()) {
                return;
            }

            if (this.records.length <= 1) {
                await this.fetchRecords()
            } else if (this.records.length <= 2) {
                // noinspection ES6MissingAwait
                this.fetchRecords();
            }

            this.setNodeRunning(false);
            this.records.shift();
            this.step = 0;
            this.setNodeRunning(true);
        },
        async nextStep() {
            if (!this.isDebugging()) {
                return
            }

            if (this.step < this.records[0].length - 1) {
                if (this.step >= 0) {
                    this.setNodeRunning(false);
                }
                this.step++;
                this.setNodeRunning(true);
            } else {
                await this.nextFrame();
            }

            let nodeId = this.records[0][this.step].nodeId;
            if (this.nodes.get(nodeId).breakPointState === 1) {
                this.playing = false;
            }

            if (this.playing) {
                setTimeout(this.nextStep, 200);
            }
        },
        playPause() {
            if (!this.isDebugging()) {
                return
            }

            if (this.playing) {
                this.playing = false;
            } else {
                this.playing = true;
                this.nextStep();
            }
        },
        removeAllBreakpoint() {
            this.tree.breakPointCount = 0;
            this.tree.enabledBreakPointCount = 0;
            this.$utils.visitSubtree(this.tree.root, node => node.breakPointState = 0);
        },
        disableAllBreakpoint() {
            this.tree.enabledBreakPointCount = 0;
            this.$utils.visitSubtree(this.tree.root, node => {
                if (node.breakPointState > 0) {
                    node.breakPointState = -1;
                }
            });
        },
        enableAllBreakpoint() {
            this.tree.enabledBreakPointCount = this.tree.breakPointCount;
            this.$utils.visitSubtree(this.tree.root, node => {
                if (node.breakPointState < 0) {
                    node.breakPointState = 1;
                }
            });
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

.debug-bar .disabled {
    color: #adabab;
}
</style>