/**
 * layout.js 与布局相关的组件
 */

 /**
  * 容器
  */
export const MtContainer = {
    name: "mt-container",
    template: /* HTML */`
    <div class="mt-container">
        <div
            role="presentation" aria-hidden="true" 
            class="invisible scrollbar horizontal fade" 
            style="position: absolute; width: 312px; height: 3px; left: 0px; bottom: 0px;">
            <div class="slider" style="position: absolute; top: 0px; left: 53px; height: 3px; transform: translate3d(0px, 0px, 0px); contain: strict; width: 147px;">

            </div>
        </div>
    </div>

    `,
    data() {
        return {
            tabs: [],
            keys: {}
        }
    },
    methods: {
        openTab(tab) {
            tab.key = tab.type + tab.key;
            if (keys[tab.key]) this.openTabByKey(tab.key);
            else {
                this.tabs.push(tab);
            }
        },
        openTabByKey(key) {

        }
    }
}

/**
 * 窗口
 */
export const MtWindow = {
    name: "mt-window",
    template: /* HTML */`
    <div class="mt-window">
        <div class="__title">
            <slot name="title"></slot>
            <div v-if="closeBtn != null" @click="close" class="__control">
                <mt-icon icon="chrome-close"></mt-icon>
            </div>
        </div>
        <slot></slot>
        <div class="__mask__" ref="mask" v-if="mask != null" v-show="active"></div>
    </div>
    `,
    props: ["closeBtn", "active", "mask"],
    mounted() {
        if (this.mask != null) document.body.appendChild(this.$refs.mask);
        document.body.appendChild(this.$el);
    },
    methods: {
        close() {
            this.$emit("close")
            this.$emit("update:active", false)
        }
    }
}