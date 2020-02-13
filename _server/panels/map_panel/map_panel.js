/**
 * map_panel.js 地图编辑界面
 */
import game from "../../editor_game.js";
import { importCSS } from "../../editor_ui.js";

import mapExplorer from "./map_explorer.js";
import posData from "./pos_data.js";
import blockData from "./block_data.js";
import mapData from "./map_data.js";
import tiledEditor from "./tiled_editor.js";
import iconLib from "./icon_lib.js";
import lastUsedBlocks from "./last_used_blocks.js";

let components = {
    mapExplorer, posData, blockData, mapData, 
    tiledEditor, iconLib, lastUsedBlocks
}

importCSS("./_server/panels/map_panel/map_panel.css");

import { mapStore } from "./service.js";

export default {
    label: "地图",
    template: /* HTML */`
    <div id="mapPanel">
        <mt-side class="left transition" @toggle="(e) => leftCollapsed = e">
            <map-explorer active></map-explorer>
            <map-data></map-data>
        </mt-side>
        <div class="mid" :class="{ expend: leftCollapsed }">
            <tiled-editor v-model="iconNow"></tiled-editor>
            <last-used-blocks v-model="iconNow"></last-used-blocks>
        </div>
        <div class="right">
            <icon-lib ref="iconLib" v-model="iconNow"></icon-lib>
        </div>
        <status-item v-show="active">{{ currentMapid }}</status-item>
    </div>`,
    store: mapStore,
    computed: Vuex.mapState({
        currentMapid: 'currentMapid',
    }),
    data: function() {
        return {
            active: false,
            leftCollapsed: false,
            actionList: [],
            mode: '',
            info: {},
            doubleClickMode: 'change',
            iconNow: 0,
            // 画图区菜单
            lastRightButtonPos: [{x:0,y:0}, {x:0,y:0}],
            // 数据
            currentMap: null,
        }
    },
    created() {
        this.mapList = game.getMapList();
        this.maps = game.getMaps();
    },
    mounted() {
        let mapid = editor.towerInfo.get("lastEditFloorId", null)
            || game.data.data.access('firstData.floorId');
        this.$store.commit('openMap', mapid);
    },
    activated() {
        this.active = true;
    },
    deactivated() {
        this.active = false;
    },
    watch: {
        currentMapid(newValue, oldValue) {
            if (this.currentMap) this.currentMap.save();
            this.currentMap = this.maps[newValue];
        }
    },
    components,
}