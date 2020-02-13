/**
 * script_panel.js 脚本编辑界面
 */
import game from "../../editor_game.js";
import { importCSS } from "../../editor_ui.js";

import scriptTree from "./script_tree.js";
import pluginLib from "./plugin_lib.js";
import pluginDetail from "./plugin_detail.js";

let components = {
    scriptTree, pluginLib, pluginDetail
}

let leftPanels = [
    "scriptTree", "pluginLib"
];

importCSS("./_server/panels/script_panel/script_panel.css");

export default {
    label: "脚本",
    template: /* HTML */`
    <div class="main-side-layout" id="scriptPanel">
        <mt-side class="left" @toggle="e => leftCollapsed = e">
            <script-tree active ref="scriptTree" @openTab="openTab"></script-tree>
            <plugin-lib @openTab="openTab"></plugin-lib>
        </mt-side>
        <div class="mid" :class="{ expend: leftCollapsed }">
            <mt-view v-show="viewer" ref="view" @switch="switchTab" @close="closeTab">
            </mt-view>
            <code-editor v-show="viewer=='script'" ref="editor"
                :active="viewer=='script'"
                lang="javascript" @save="saveScript"
            ></code-editor>
            <keep-alive>
                <plugin-detail v-if="viewer=='plugin'" :info="tab.info"></plugin-detail>
            </keep-alive>
            <div v-show="!viewer" class="empty"></div>
        </div>
        <status-item></status-item>
    </div>
    `,
    data() {
        return {
            active: false,
            tabs: [],
            viewer: null,
            tab: {},
            leftCollapsed: false,
        }
    },
    created() {
        console.log(this.$refs);
    },
    activated() {
        this.active = true;
    },
    deactivated() {
        this.active = false;
    },
    methods: {
        openTab(tab) {
            this.$refs.view.openTab(tab);
        },
        switchTab(tab) {
            this.tab = tab;
            this.viewer = tab.type;
            if (this.viewer == "script") {
                const refs = this.$refs;
                this.$nextTick(() => {
                    refs.editor.load(tab);
                });
            }
        },
        async saveScript(node) {
            await this.$refs.scriptTree.saveNode(node);
        },
        async closeTab(tab) {
            if (tab.type == "script") {
                if (tab.editted) {
                    if (confirm("是否保存对"+tab.label+"的编辑?")) {
                        tab.text = tab.model.getValue();
                        await this.saveScript(tab);
                    }
                    tab.model.dispose();
                    delete tab.model;
                }
            }
        }
    },
    components,
}
