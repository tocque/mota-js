let libURL = "https://h5mota.com/plugins/getList.php";

export default {
    template: /* HTML */`
    <mt-side-pane pane="pluginLib" icon="extensions" label="插件库">
        <mt-search placeholder="搜索插件"></mt-search>
        <div class="container">
            <ul>
                <li v-for="(info, index) of pluginList"
                    :key="index" :info="info" :class="chosen == index"
                    @click="chose(info, index)"
                >
                    <h5>{{ info.name }}</h5>
                    <p>{{ info.abstract }}</p>
                    <span>{{ info.author }}</span>
                </li>
            </ul>
        </div>
    </mt-side-pane>
    `,
    data() {
        return {
            chosen: -1,
            pluginList: [],
        }
    },
    created() {
        this.load();
    },
    methods: {
        async load() {
            this.pluginList = this.pluginList.concat((await fetch(libURL)
                .then(res => res.json())
                .catch(e => editor.window.$notify.error("无法加载插件列表, 请检查网络连接"), {
                    source: "插件库"
                })).data);
        },
        chose(info, index) {
            this.chosen = index;
            this.$emit("openTab", {
                type: "plugin",
                info,
                id: index,
                icon: "plug",
                label: "扩展: "+info.name,
            });
        },
    }
}