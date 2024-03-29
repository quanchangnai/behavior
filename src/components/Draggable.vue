<template>
    <div ref="body"
         class="draggable"
         :class="{moving:state===1}"
         :style="{left:left+'px',top:top+'px'}"
         @mousedown.left="onMouseDown"
         @dragstart.prevent>
        <slot/>
    </div>
</template>

<script>
export default {
    name: "Draggable",
    props: {
        ctrlKey: {//true:ctrl键按下时才能拖动,false:ctrl键松开时才能拖动,null:不管ctrl键是否按下都可以拖动
            type: Boolean,
            default: null
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
            if (event?.target.tagName === "INPUT") {
                return;
            }

            if (!this.checkCtrlKey(event)) {
                return;
            }

            if (window.dragging) {
                return;
            }

            window.dragging = true;
            window.addEventListener("mousemove", this.onMouseMove);
            window.addEventListener("mouseup", this.onMouseUp, {once: true});
            this.state = 0;
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
                this.$emit("drag-start", this.dragEvent(event));
            }

            this.left = this.left + event.movementX / this.scale;
            this.top = this.top + event.movementY / this.scale;
            this.$emit("dragging", this.dragEvent(event));
        },
        onMouseUp(event) {
            if (this.state < 0) {
                return;
            }

            try {
                window.removeEventListener("mousemove", this.onMouseMove);
                if (this.state > 0) {
                    this.$emit("drag-end", this.dragEvent(event));
                }
            } finally {
                this.state = -1;
                window.dragging = false;
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

.draggable.moving {
    cursor: move;
}

>>> :not(input)::selection {
    background-color: transparent;
}
</style>