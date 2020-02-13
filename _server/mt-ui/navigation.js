import { isset } from "../editor_util.js";

/**
 * 标签页组件, 导航类的基组件
 */
export const MtTabs = {
    name: "mt-tabs",
    template: /* HTML */`
        <ul class="mt-tabs">
            <li v-for="(tab, index) of tabs" :key="index"
                :title="tab.label" @click="switchTab(tab)"
                class="mt-tab" :class="{ active: chosen == tab.id }">
                <slot name="tab" :tab="tab" :active="chosen == tab.id">{{ tab.label }}</slot>
            </li>
            <slot name="default"></slot>
        </ul>
    `,
    props: ["tabs", "init", "allowUnchose"],
    data() {
        return {
            chosen: null
        }
    },
    created() {
        if (this.init) {
            for (let t of this.tabs) {
                if (t.id == this.init) {
                    this.switchTab(t); 
                    break;
                }
            }
        }
    },
    methods: {
        switchTab(tab) {
            if (isset(this.allowUnchose) && tab.id == this.chosen) {
                this.chosen = null;
                this.$emit('switch', null);
            } else {
                this.chosen = tab.id;
                this.$emit('switch', tab);
            }
        },
    },
};

/**
 * 侧边栏组件
 */
export const MtSide = {
    name: "mt-side",
    render(h) {
        const panels = this.$slots.default;
        return h('div', { class: ["side-bar", { "collapsed": this.tucked }] }, [
            h('div', { class: "side-switcher" }, [
                h('mt-tabs', {
                    props: {
                        tabs: this.panels,
                        allowUnchose: true,
                    },
                    on: {
                        switch: this.switchPane
                    },
                    scopedSlots: {
                        tab: props => h('i', {
                            class: ["codicon", "codicon-"+props.tab.icon]
                        })
                    },
                    ref: "switcher"
                })
            ]),
            h('div', {
                class: "side-panel",
            }, panels)
        ])
    },
    data: function() {
        return {
            chosen: null,
            panels: [],
            tucked: false,
        }
    },
    mounted() {
        let panes = this.$slots.default;
        this.$nextTick(function() {
            for (let pane of panes) {
                if (!pane.elm.getAttribute) continue;
                const attr = p => pane.elm.getAttribute(p);
                const tab = { id: attr("pane"), icon: attr("icon"), elm: pane.elm };
                this.panels.push(tab);
                if (isset(pane.elm.getAttribute("active"))) {
                    this.$refs.switcher.switchTab(tab);
                }
            }
        }.bind(this));
    },
    methods: {
        switchPane(pane) {
            if (!isset(pane)) {
                this.toggle();
            } else {
                if (isset(this.chosen)) {
                    this.chosen.elm.removeAttribute("active");
                }
                this.chosen = pane;
                this.chosen.elm.setAttribute("active", "");
                this.toggle(false);
                this.$emit("switch", pane);
            }
        },
        toggle(code) {
            if (!isset(code)) code = !this.tucked;
            this.tucked = code;
            this.$emit("toggle", code);
        }
    }
};

/**
 * 侧边栏面板
 */
export const MtSidePane = {
    name: "mt-side-pane",
    functional: true,
    render(h, ctx) {
        let c = ctx.data.class instanceof Array ? ctx.data.class : [ctx.data.class];
        return h('div', {
            staticClass: ctx.data.staticClass,
            class: ['side-pane', ctx.props.pane, ...c],
            attrs: ctx.props
        }, [
            h('h3', { class: "header" }, ctx.props.label),
            h('div', { class: "content" }, ctx.slots().default)
        ])
    },
    props: ["label", "icon", "pane"]
}

import { MtIcon } from "./others.js"

/**
 * 标签浏览
 */
export const MtView = {
    name: "mt-view",
    template: /* HTML */`
    <div class="mt-view">
        <mt-tabs :tabs="tabs" allowUnchose ref="tabs" @switch="switchTab">
            <template #tab="{ tab }">
                <slot name="tab">
                    <mt-icon :icon="tab.icon" :size="18"></mt-icon>
                    <span>{{ tab.label }}</span>
                    <mt-icon 
                        :icon="tab.editted ? 'circle-filled' : 'close'"
                        @click="closeTab(tab)" :size="18"
                        class="status-icon" :class="{ editted: tab.editted }"
                    ></mt-icon>
                </slot>
            </template>
        </mt-tabs>
        <div class="toolBar">
            <slot name="tools"></slot>
            <div v-if="canClose"><li></li></div>
        </div>
    </div>
    `,
    props: ["canClose"],
    data() {
        return {
            tabNow: null,
            tabs: [],
            keys: {}
        }
    },
    methods: {
        openTab(tab) {
            let key = tab.type + tab.id;
            if (!this.keys[key]) {
                this.keys[key] = tab;
                this.insertTabAfter(tab, this.tabNow);
            }
            this.$refs.tabs.switchTab(this.keys[key]);
        },
        switchTab(tab) {
            this.$emit('switch', tab);
            this.tabNow = tab;
        },
        openTabByKey(key) {
            this.openTab(this.keys[key]);
        },
        insertTabAfter(tab, after) {
            const index = after ? this.tabs.indexOf(after) + 1 : 0;
            this.tabs.splice(index, 0, tab);
        },
        closeTab(tab) {
            const handler = {};
            this.$emit("close", tab, handler);
            if (handler.prevent) return;
            const index = this.tabs.indexOf(tab);
            this.tabs.splice(index, 1);
        },
        closeAll() {
            const handler = {};
            for (let tab of this.tabs) {
                this.$emit("close", tab, handler);
                if (handler.prevent) return;
            }
            Vue.$set(this.tabs, []);
        }
    },
    components: { MtIcon },
}