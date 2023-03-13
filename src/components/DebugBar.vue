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
    </div>
</template>

<script>
import {ipcRenderer} from "electron";

export default {
    name: "DebugBar",
    data() {
        return {
            tree: null,//当前行为树
            runLog: [
                [{nodeId: 1}, {nodeId: 2}, {nodeId: 3}, {nodeId: 4}, {nodeId: 5}],
                [{nodeId: 1}, {nodeId: 2}, {nodeId: 4}, {nodeId: 6}, {nodeId: 7}, {nodeId: 8}]
            ],
            playId: 0,
        }
    },
    created() {
        ipcRenderer.on("debug", this.debug);
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
                {tip: "停止调试", icon: "el-icon-circle-close", handle: this.debug},
            ]
        }
    },
    methods: {
        debug() {
            if (!this.tree) {
                return;
            }

            if (this.playId > 0) {
                this.playPause();
            }

            if (this.isDebugging()) {
                this.setNodeRunning(false);
                this.tree.nodes = null;
                this.tree.currentFrame = 0;
                this.tree.currentStep = 0;
            } else {
                this.tree.nodes = new Map();
                this.$utils.visitSubtree(this.tree.root, node => this.tree.nodes.set(node.id, node));
                this.tree.currentFrame = 0;
                this.tree.currentStep = 0;
                this.setNodeRunning(true);
            }

            this.$forceUpdate();
        },
        isDebugging() {
            return this.tree?.nodes != null;
        },
        setNodeRunning(running) {
            if (this.isDebugging()) {
                let nodeId = this.runLog[this.tree.currentFrame][this.tree.currentStep].nodeId;
                this.tree.nodes.get(nodeId).running = running;
            }
        },
        nextFrame() {
            if (!this.isDebugging()) {
                return
            }

            if (this.tree.currentFrame < this.runLog.length - 1) {
                this.setNodeRunning(false);
                this.tree.currentFrame++;
                this.tree.currentStep = 0;
                this.setNodeRunning(true);
            }
        },
        nextStep() {
            if (!this.isDebugging()) {
                return
            }

            if (this.tree.currentStep < this.runLog[this.tree.currentFrame].length - 1) {
                this.setNodeRunning(false);
                this.tree.currentStep++;
                this.setNodeRunning(true);
            } else if (this.tree.currentFrame < this.runLog.length - 1) {
                this.nextFrame();
            } else if (this.playId > 0) {
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
                this.playId = setInterval(this.nextStep, 300);
            }
        }
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