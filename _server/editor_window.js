/**
 * editor_window.js 编辑器视图入口
 * 
 * vue template可以使用 Comment tagged templates 语法高亮
 * https://marketplace.visualstudio.com/items?itemName=bierner.comment-tagged-templates
 */
import game from "./editor_game.js"
import "./thirdparty/elementUI/elementui.umd.min.js"

import blocklyEditor from "./editor_blockly.js"
import "./editor_multi.js"

import mapPanel from "./panels/map_panel/map_panel.js"
import scriptPanel from "./panels/script_panel/script_panel.js"

let mainPanels = {
    mapPanel, scriptPanel
}

Vue.component("status-item", {
    template: /* html */`<li><slot></slot></li>`,
    props: ["left", "priority"],
    mounted() {
        this.$el.priority = this.priority || 0;
        this.$injectStatusItem(this.left !== undefined ? "left" : "right", this);
    }
});

let window = {
    el: "#window",
    data: {
        mainPanelActive: "",
        mainPanels: [],
        projectName: editor.projectName, // 与标题相绑定
        statusLeft: [],
        messageType: 'normal',
        message: '',
        statusRight: [],
    },
    created() {
        Vue.prototype.$print = this.print.bind(this);
        Vue.prototype.$clear = this.clear.bind(this);
        Vue.prototype.$injectStatusItem = this.injectStatusItem.bind(this);
        editor.openBlockly = this.openBlockly;

        this.projectName = game.getProjectName();
        this.mainPanels = this.mainPanels.concat(Object.entries(mainPanels)
            .map(e => { return { id: e[0], label: e[1].label };}));
    },
    methods: {
        print: function (str, type) {
            this.message = str;
            if (!type) type = "normal";
            this.messageType = type;
        },
        clear: function(value) {
            var tips = [
                '表格的文本域可以双击进行编辑',
                '双击地图可以选中素材，右键可以弹出菜单',
                '双击事件编辑器的图块可以进行长文本编辑/脚本编辑/地图选点/UI绘制预览等操作',
                'ESC或点击空白处可以自动保存当前修改',
                'H键可以打开操作帮助哦',
                'tileset贴图模式可以在地图上拖动来一次绘制一个区域；右键额外素材也可以绑定宽高',
                '可以拖动地图上的图块和事件，或按Ctrl+C, Ctrl+X和Ctrl+V进行复制，剪切和粘贴，Delete删除',
                'Alt+数字键保存图块，数字键读取保存的图块',
            ];
            if (value == null) value = Math.floor(Math.random() * tips.length);
            this.print('tips: ' + tips[value])
        },
        switchMainPanel: function(panel) {
            this.mainPanelActive = panel.id;
            //this.$refs[panel.pane].active();
        },
        injectStatusItem: function(align, item) {
            editor.ui.insertSortElm(this.$refs[align], item.$el);
        },
    },
    components: {
        ...mainPanels, blocklyEditor
    },
    watch: {
        projectName(value) {
            document.title = value + " - HTML5 魔塔编辑器";
        }
    }
};

export default function init() {
    return new Vue(window);
}
//editor_mode = editor_mode(editor);