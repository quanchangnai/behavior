<template>
    <div v-if="visibleItems"
         ref="body"
         class="context-menu"
         :style="{left:x+'px',top:y+'px'}"
         @mouseenter="mouseover=true"
         @mouseleave="mouseover=false"
         @mousedown.stop>
        <div v-for="(item,index) in visibleItems"
             :key="'item-'+index"
             class="context-menu-item"
             :class="{disabled:item.disabled}"
             @click="onItemClick($event,item)">
            <slot :item="item">
                <div ref="itemLabels"
                     style="float: left;"
                     :style="{'min-width':labelWidth+'px'}">
                    {{ item.label }}
                </div>
                <div v-if="item.shortcut"
                     style="float: right;margin-left: 15px">
                    {{ item.shortcut }}
                </div>
                <div style="clear: both"/>
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
                return [{label: "测试1", shortcut: "Alt+T", handler: null}, {label: "测试2", disabled: true}]
            }
        }
    },
    data() {
        return {
            x: 0,
            y: 0,
            mouseover: false,
            visibleItems: null,
            onHide: null,
            labelWidth: 0
        }
    },
    methods: {
        /**
         * 显示菜单
         * @param x {Number} 坐标X
         * @param y {Number} 坐标Y
         * @param limits  {String|Element|{x,y,width,height}} 限制显示范围，元素选择器字符串、元素对象、指定的限制对象
         * @param items  {Array} 菜单项，覆盖items属性
         * @param onHide  {Function} 菜单隐藏时的回调函数
         */
        show(x, y, limits = null, items = null, onHide = null) {
            this.visibleItems = items || this.items;
            if (!this.visibleItems?.length) {
                return;
            }

            this.x = x;
            this.y = y;
            this.onHide = onHide;

            window.addEventListener("mousedown", this.onMousedown, true);
            window.addEventListener("resize", this.hide);
            window.addEventListener("scroll", this.hide);
            window.addEventListener("blur", this.hide);
            window.addEventListener("wheel", this.hide);

            this.$nextTick(() => {
                for (const itemLabel of this.$refs.itemLabels) {
                    this.labelWidth = Math.max(this.labelWidth, itemLabel.offsetWidth);
                }

                if (typeof limits === "string") {
                    limits = document.querySelector(limits);
                }

                if (limits instanceof Element) {
                    let limitsWidth = limits.clientWidth;
                    let limitsHeight = limits.clientHeight;
                    if (limits instanceof HTMLElement) {
                        limitsWidth = limits.offsetWidth;
                        limitsHeight = limits.offsetHeight;
                    }
                    limits = {
                        x: this.$utils.getOffsetX(limits),
                        y: this.$utils.getOffsetY(limits),
                        width: limitsWidth,
                        height: limitsHeight,
                    };
                } else if (!limits) {
                    limits = {x: 0, y: 0, width: innerWidth, height: innerHeight};
                }

                let width = this.$refs.body.offsetWidth;
                let height = this.$refs.body.offsetHeight;
                if (x + width * 1.1 > limits.x + limits.width && limits.width > width) {
                    this.x = Math.max(x - width, limits.x + width * 0.1);
                }
                if (y + height * 1.1 > limits.y + limits.height && limits.height > height) {
                    this.y = Math.max(y - height, limits.y + height * 0.1);
                }
            });
        },
        onMousedown(event) {
            if (!this.mouseover) {
                this.hide(event);
            }
        },
        hide(domEvent, clickItem = false) {
            if (!this.visibleItems) {
                return;
            }
            this.visibleItems = null;

            window.removeEventListener("mousedown", this.onMousedown);
            window.removeEventListener("resize", this.hide);
            window.removeEventListener("scroll", this.hide);
            window.removeEventListener("blur", this.hide);
            window.removeEventListener("wheel", this.hide);

            let hideEvent = {ctrlKey: domEvent?.ctrlKey || false, clickItem};
            this.$emit("hide", hideEvent);
            if (this.onHide) {
                this.onHide(hideEvent);
            }
        },
        onItemClick(event, item) {
            if (item.disabled === true) {
                return;
            }

            this.hide(event, true);
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
    font-size: 13px;
    user-select: none;
    cursor: pointer;
    border: solid #e4e7ed 1px;
    border-radius: 3px;
    background-color: #ffffff;
    box-shadow: 2px 2px 2px #a1a6ab;
}

.context-menu-item {
    padding: 1px 20px;
}

.context-menu-item:first-child {
    padding: 4px 20px 1px 20px !important;
}

.context-menu-item:last-child {
    padding: 1px 20px 4px 20px !important;
}


.context-menu-item:hover {
    background-color: #f5f7fa;
}

.context-menu-item.disabled {
    color: #adabab;
}

</style>