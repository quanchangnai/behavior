<template>
    <div v-if="visible"
         class="context-menu"
         ref="contextMenu"
         :style="{left:x+'px',top:y+'px'}"
         @mouseover="mouseover=true"
         @mouseout="mouseover=false"
         @mousedown.stop>
        <div v-for="(item,index) in items"
             :key="'item-'+index"
             class="context-menu-item"
             @click="()=>onItemClick(item)">
            {{ item.title }}
        </div>
    </div>
</template>

<script>

export default {
    name: "ContextMenu",
    props: {
        items: {
            type: Array,
            default: function () {
                return [{title: "测试1", handler: null}, {title: "测试2", handler: null}]
            }
        }
    },
    data() {
        return {
            visible: false,
            x: 0,
            y: 0,
            mouseover: false
        }
    },
    methods: {
        show(x, y) {
            if (!this.items.length) {
                return;
            }
            this.visible = true;
            this.x = x;
            this.y = y;
            window.addEventListener("mousedown", this.tryHide, {capture: true});
            window.addEventListener("resize", this.hide);
            window.addEventListener("scroll", this.hide);
        },
        tryHide() {
            if (!this.mouseover) {
                this.hide();
            }
        },
        hide() {
            this.visible = false;
            window.removeEventListener("mousedown", this.tryHide);
            window.removeEventListener("resize", this.hide);
            window.removeEventListener("scroll", this.hide);
            this.$emit("hide");
        },
        onItemClick(item) {
            this.hide();
            if (item.handler != null) {
                item.handler.call(item);
            }
        }
    }
}
</script>

<style scoped>
.context-menu {
    position: fixed;
    z-index: 1000;
    min-width: 80px;
    min-height: 25px;
    line-height: 25px;
    user-select: none;
    cursor: pointer;
    border: solid #e9e9eb 1px;
    background-color: #f4f4f5;
}

.context-menu-item {
    padding: 1px 12px;
}

.context-menu-item:hover {
    background-color: #e9e9eb;
}
</style>