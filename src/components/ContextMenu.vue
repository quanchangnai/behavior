<template>
    <div v-if="visibleItems"
         ref="menu"
         class="context-menu"
         :style="{left:x+'px',top:y+'px'}"
         @mouseover="mouseover=true"
         @mouseout="mouseover=false"
         @mousedown.stop>
        <div v-for="(item,index) in visibleItems"
             :key="'item-'+index"
             class="context-menu-item"
             @click="onItemClick(item)">
            <slot :item="item">
                {{ item.label }}
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
                return [{label: "测试1", handler: null}, {label: "测试2", handler: null}]
            }
        }
    },
    data() {
        return {
            x: 0,
            y: 0,
            mouseover: false,
            visibleItems: null
        }
    },
    methods: {
        show(x, y, limits, items) {
            this.visibleItems = items ? items : this.items;
            if (!this.visibleItems?.length) {
                return;
            }

            this.x = x;
            this.y = y;

            window.addEventListener("mousedown", this.tryHide, {capture: true});
            window.addEventListener("resize", this.hide);
            window.addEventListener("scroll", this.hide);
            window.addEventListener("blur", this.hide);
            window.addEventListener("wheel", this.hide);

            this.$nextTick(() => {
                if (limits instanceof Element) {
                    limits = {
                        x: this.$utils.getOffsetX(limits),
                        y: this.$utils.getOffsetY(limits),
                        width: limits.offsetWidth,
                        height: limits.offsetHeight,
                    };
                } else if (!limits) {
                    limits = {x: 0, y: 0, width: innerWidth, height: innerHeight};
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
            if (!this.visibleItems) {
                return;
            }
            this.visibleItems = null;
            window.removeEventListener("mousedown", this.tryHide);
            window.removeEventListener("resize", this.hide);
            window.removeEventListener("scroll", this.hide);
            window.removeEventListener("blur", this.hide);
            window.removeEventListener("wheel", this.hide);
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