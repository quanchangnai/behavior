<template>
    <div class="draggable"
         :style="{left: left + 'px', top: top + 'px'}"
         @mousedown.left.stop="onMouseDown">
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
        initDragging: {
            type: Boolean,
            default: false
        },
        payload: Object
    },
    data() {
        return {
            left: this.x,
            top: this.y,
            dragging: false
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
        if (this.initDragging) {
            this.onMouseDown();
        }
    },
    methods: {
        onMouseDown() {
            this.dragging = true;
            window.addEventListener("mousemove", this.onMouseMove);
            window.addEventListener("mouseup", this.onMouseUp, {once: true});
            this.$emit("drag-start", {x: this.left, y: this.top, payload: this.payload});
        },
        onMouseMove(event) {
            if (!this.dragging) {
                return
            }
            //devicePixelRatio:屏幕缩放比例
            this.left = this.left + event.movementX / devicePixelRatio;
            this.top = this.top + event.movementY / devicePixelRatio;
            this.$emit("dragging", {x: this.left, y: this.top, payload: this.payload});
        },
        onMouseUp() {
            if (!this.dragging) {
                return
            }

            this.dragging = false;
            window.removeEventListener("mousemove", this.onMouseMove);
            this.$emit("drag-end", {x: this.left, y: this.top, payload: this.payload});
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