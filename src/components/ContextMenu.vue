<template>
    <div v-if="visible"
         ref="menu"
         class="context-menu"
         :style="{left:x+'px',top:y+'px'}"
         @mouseover="mouseover=true"
         @mouseout="mouseover=false"
         @mousedown.stop>
        <div v-for="(item,index) in items"
             :key="'item-'+index"
             class="context-menu-item"
             @click="onItemClick(item)">
            <slot :item="item">
                {{ item.title }}
            </slot>
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
        show(x, y, limits) {
            if (!this.items.length) {
                return;
            }

            this.visible = true;
            this.x = x;
            this.y = y;

            window.addEventListener("mousedown", this.tryHide, {capture: true});
            window.addEventListener("resize", this.hide);
            window.addEventListener("scroll", this.hide);
            window.addEventListener("blur", this.hide);

            this.$nextTick(() => {
                if (!limits) {
                    limits = {x: 0, y: 0, width: document.body.offsetWidth, height: document.body.offsetHeight}
                }
                let width = this.$refs.menu.offsetWidth;
                let height = this.$refs.menu.offsetHeight;
                if (x + width * 1.1 > limits.x + limits.width && limits.width > width) {
                    this.x = Math.max(x - width, limits.x + width * 0.1);
                }
                if (y + height * 1.1 > limits.y + limits.height && limits.height > height) {
                    this.y = Math.max(y - height, limits.y + height * 0.1);
                }
            });
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
            window.removeEventListener("blur", this.hide);
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
    border: solid #e4e7ed 1px;
    border-radius: 3px;
    background-color: #ffffff;
    box-shadow: 2px 2px 2px #a1a6ab;
}

.context-menu-item {
    padding: 1px 12px;
}

.context-menu-item:hover {
    background-color: #f5f7fa;
}
</style>