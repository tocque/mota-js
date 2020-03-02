import * as ui from "./editor_ui.js"
import * as util from "./editor_util.js"
import * as file from "./editor_file.js"
import game from "./editor_game.js"
import listen from "./editor_listen.js"
import service from "./editor_service.js"

const libs = {
    util, game, ui, listen, service, file
};

class editor {
    version = "2.0";

    proJectName = ''; // vue监听

    constructor() {
        this.fs = fs;
        this.afterload = this.load();
    }

    /** 加载编辑器所需的各个模块 */
    async load() {
        console.log(libs);
        for (let lib in libs) { // 仍然提供通过editor访问的方式, 但是原则上内部不使用
            if (libs.hasOwnProperty(lib)) {
              this[lib] = libs[lib];
            }
        }

        this.userdata = await new file.config("./_server/config.json");
        [this.towerInfo, this.window] = await Promise.all([
            new file.config("./work.h5mota"),
            import('./editor_window.js'),
            game.hooks.floorsLoad
        ]);

        game.buildMapTree(this.towerInfo.get("mapStruct"));

        this.window = this.window.default();
        return this;
    };
}

window.onerror = function (msg, url, lineNo, columnNo, error) {
    const string = msg.toLowerCase();
    const substring = "script error";
    let message;
    if (string.includes(substring)){
        message = '脚本错误: 查看浏览器控制台(F12)以获得详细信息';
        try {
            editor.window.$notify.error(msg);
        } catch (e) {
            alert(message);
        }
    } else {
        if (url) url = url.substring(url.lastIndexOf('/')+1);
        try {
            editor.window.$notify.error(`${msg}, Error object: ${JSON.stringify(error)}`, {
                source: `${url} - Line: ${lineNo}, Column: ${columnNo}`
            });
        } catch (e) {
            message = [
                'Message: ' + msg,
                'URL: ' + url,
                'Line: ' + lineNo,
                'Column: ' + columnNo,
                'Error object: ' + JSON.stringify(error)
            ].join(' - ');
            alert(message);
        }

        // alert(message);
    }
    return false;
};

window.editor = new editor();