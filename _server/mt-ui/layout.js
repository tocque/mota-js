/**
 * layout.js 与布局相关的组件
 */

 /**
  * 容器
  */
export const MtContainer = {
    name: "mt-view",
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