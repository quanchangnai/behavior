<template>
    <div ref="draggable"
         class="draggable"
         :style="{left: left + 'px', top: top + 'px'}"
         @mousedown.left.stop="onMouseDown">
        <slot/>
    </div>
</template>

<script>
export default {
    name: "Draggable",
    props: {
        ctrlKey: {//true:ctrl键按下时才能拖动,false:ctrl键松开时才能拖动,null:忽略ctrl键是否按下
            type: Boolean,
            default: false
        },
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
        scale: {
            type: Number,
            default: 1
        },
        payload: Object
    },
    data() {
        return {
            left: this.x,
            top: this.y,
            cursor: null,
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
        checkCtrlKey(event) {
            return !event || this.ctrlKey === null || this.ctrlKey === event.ctrlKey;
        },
        dragEvent(domEvent) {
            return {
                x: this.left,
                y: this.top,
                ctrlKey: domEvent?.ctrlKey || false,
                payload: this.payload
            };
        },
        onMouseDown(event) {
            if (event) {
                if (event.target.tagName === "INPUT") {
                    return;
                } else {
                    event.preventDefault();
                }
            }

            if (!this.checkCtrlKey(event)) {
                return;
            }

            this.state = 0;
            window.addEventListener("mousemove", this.onMouseMove);
            window.addEventListener("mouseup", this.onMouseUp, {once: true});
        },
        onMouseMove(event) {
            if (this.state < 0) {
                return;
            }
            if (!this.checkCtrlKey(event)) {
                if (this.state > 0) {
                    this.onMouseUp();
                }
                return;
            }

            if (this.state === 0) {
                this.state = 1;
                this.cursor = getComputedStyle(this.$refs.draggable).cursor;
                this.$refs.draggable.style.cursor = "move";
                this.$emit("drag-start", this.dragEvent(event));
            }

            //devicePixelRatio:屏幕缩放比例
            this.left = this.left + event.movementX / (this.scale * devicePixelRatio);
            this.top = this.top + event.movementY / (this.scale * devicePixelRatio);
            this.$emit("dragging", this.dragEvent(event));
        },
        onMouseUp(event) {
            if (this.state < 0) {
                return;
            }

            try {
                window.removeEventListener("mousemove", this.onMouseMove);
                if (this.cursor && this.$refs.draggable) {
                    this.$refs.draggable.style.cursor = this.cursor;
                    this.cursor = null;
                }
                if (this.state > 0) {
                    this.$emit("drag-end", this.dragEvent(event));
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
    cursor: default;
}

>>> :not(input)::selection {
    background-color: transparent;
}
</style>