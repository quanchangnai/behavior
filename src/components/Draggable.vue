<template>
    <div class="draggable"
         :style="{left: left + 'px', top: top + 'px'}"
         @mousedown.left="onMouseDown">
        <slot/>
    </div>
</template>

<script>
export default {
    name: "Draggable",
    props: {
        x: {
            type: Number,
            default: 0
        },
        y: {
            type: Number,
            default: 0
        },
        ready: {
            type: Boolean,
            default: false
        },
        freeze: {
            type: Boolean,
            default: false
        },
        payload: Object
    },
    data() {
        return {
            left: this.x,
            top: this.y,
            state: -1//-1:没有被拖拽,0:鼠标按下准备拖拽,1:正在被拖拽
        }
    },
    watch: {
        x(value) {
            this.left = value
        },
        y(value) {
            this.top = value
        }
    },
    mounted() {
        if (this.ready) {
            this.onMouseDown();
        }
    },
    methods: {
        onMouseDown() {
            this.state = 0;
            window.addEventListener("mousemove", this.onMouseMove);
            window.addEventListener("mouseup", this.onMouseUp, {once: true});
        },
        onMouseMove(event) {
            if (this.state < 0 || this.freeze) {
                return;
            }
            if (this.state === 0) {
                this.state = 1;
                this.$emit("drag-start", {x: this.left, y: this.top, payload: this.payload});
            }

            //devicePixelRatio:屏幕缩放比例
            this.left = this.left + event.movementX / devicePixelRatio;
            this.top = this.top + event.movementY / devicePixelRatio;
            this.$emit("dragging", {x: this.left, y: this.top, payload: this.payload});
        },
        onMouseUp() {
            if (this.state < 0) {
                return;
            }

            try {
                window.removeEventListener("mousemove", this.onMouseMove);
                if (this.state > 0) {
                    this.$emit("drag-end", {x: this.left, y: this.top, payload: this.payload});
                }
            } finally {
                this.state = -1;
            }
        }
    }
}
</script>

<style scoped>
.draggable {
    position: absolute;
    user-select: none;
}

.draggable:hover {
    cursor: move;
}

</style>