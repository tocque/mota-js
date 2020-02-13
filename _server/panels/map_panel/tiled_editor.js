editor.service.register('tiledEditor', 'Clipboard', {
    data: {
        block: null,
        events: null,
        pos: null,
    },
    mounted(h) {
        var _this = this;
        h.$refs.contextmenu.inject([
            {
                text: "复制事件",
                action: (e, h) => _this.store(h.pos),
            },
            {
                text: "剪切事件",
                action: (e, h) => {
                    _this.store(h.pos);
                    h.clearPos(h.pos);
                }
            },
            {
                text: (e, h) => `粘贴事件(${_this.pos.x}, ${_this.pos.y})到此处`,
                vaildate: (e, h) => !_this.pos.equal(h.pos) && _this.clipboard,
                action: function (e, h) {
                    editor.savePreMap();
                    editor_mode.onmode('');
                    editor.pasteToPos(editor.uivalues.lastCopyedInfo[1]);
                    editor.updateMap();
                    editor.file.saveFloorFile(function (err) {
                        if (err) {
                            printe(err);
                            throw (err)
                        };
                        printf('复制事件成功');
                        editor.tiledEditor.drawPosSelection();
                    });
                },
            },
            {
                text: (e, h) => `交换事件${h.pos.format(",")}与此事件的位置`,
            },
        ], 'group');
    },
    methods: {
        store(pos) {
            var fields = Object.keys(editor.file.comment._data.floors._data.loc._data);
            this.block = core.clone(this.$host.blockAt(pos));
            this.events = {};
            this.pos = pos.copy();
            let events = this.events;
            fields.forEach(function(v) {
                events[v] = core.clone(editor.currentFloorData[v][pos.format(",")]);
            })
        },
        pasteTo(pos) {
            var fields = Object.keys(editor.file.comment._data.floors._data.loc._data);
            this.$host.blockAt(pos) = core.clone(this.map);
            let events = this.events;
            fields.forEach(function(v) {
                if (events[v] == null) delete editor.currentFloorData[v][pos.format(",")];
                else editor.currentFloorData[v][pos.format(",")] = core.clone(info.events[v]);
            });
        },

        /**
         * this.dom.moveLoc.onmousedown
         * 菜单 移动此事件
         */
        moveLoc_click: function (e) {
            editor.savePreMap();
            editor_mode.onmode('');
            this.exchangePos(editor.pos, editor.uivalues.lastRightButtonPos[1]);
        },
    }
})

export default {
    template: /* HTML */`
    <div>
        <table class="col" id='mapColMark'></table>
        <table class="row" id='mapRowMark'></table>
        <div class="map" id="mapEdit">     
            <canvas class='gameCanvas' id='bg' width='416' height='416'></canvas>
            <canvas class='gameCanvas' id='event' width='416' height='416'></canvas>
            <canvas class='gameCanvas' id='hero' width='416' height='416'></canvas>
            <canvas class='gameCanvas' id='event2' width='416' height='416'></canvas>
            <canvas class='gameCanvas' id='fg' width='416' height='416'></canvas>
            <canvas class='gameCanvas' id='efg' width='416' height='416'></canvas>
            <canvas 
                class='gameCanvas' id='eui' 
                width='416' height='416' 
                style='z-index:100'
                @mousemove="mousemove"
                @dblclick="selectIcon"
            ></canvas>
        </div>
        <div class="tools">
            <span style="font-size: 12px"><input type="checkbox" v-model="lockMode"/>锁定模式</span>
            <br/>
            <span style="font-size: 12px;">
                <input type="radio" v-model="brushMod" value="line" />画线
                <input type="radio" v-model="brushMod" value="rectangle" />画矩形
                <input type="radio" v-model="brushMod" value="tileset" />tileset贴图
            </span>
            <br/>
            <span style="font-size: 12px">
                <input type="radio" v-model="layerMod" value="bgmap" />背景层
                <input type="radio" v-model="layerMod" value="map" checked="checked" style="margin-left: 5px" />事件层
                <input type="radio" v-model="layerMod" value="fgmap" style="margin-left: 5px" />前景层
            </span>
            <br/>
            <select id="selectFloor"></select>
            <input type="button" value="保存地图" @click="saveFloor"/>
        </div>
        <context-menu ref="contextmenu" @beforeOpen="$trigger('beforeConextMenu')"></context-menu>
    </div>`,
    props: {
        selection: Number,
    },
    model: {
        prop: 'selection',
        event: 'select'
    },
    extends: editor.service.mainEditorExtension,
    data: function() {
        return {
            pos: new editor.util.pos,
            brushMod: "line", // ["line","rectangle","tileset"]
            layerMod: "map", // ["fgmap","map","bgmap"]
            // 绘制区拖动有关
            holdingPath: 0,
            stepPostfix: null,//用于存放寻路检测的第一个点之后的后续移动
            mouseOut: true,
            startPos: null,
            endPos: null,
            // 锁定模式
            lockMode: false,
            ctx: {
                width: 416, 
                height: 416,
            }
        }
    },
    mounted: function() {
        editor.tiledEditor = this;
        this.dom = {
            eui:document.getElementById('eui'),
            euiCtx:document.getElementById('eui').getContext('2d'),
            efg:document.getElementById('efg'),
            efgCtx:document.getElementById('efg').getContext('2d'),
            mid: this.$el,
            mapEdit: document.getElementById('mapEdit'),
        }
        this.$refs.contextmenu.inject([
            {
                text: (e, h) => `编辑此点(${h.eToPos(e).format(",")})`,
                action: function (e, h) {
                    h.$changeMode("editEvent");
                    h.drawPosSelection(h.eToPos(e));

                    editor_mode.onmode('nextChange');
                    editor_mode.onmode('loc');
                    //editor_mode.loc();
                    //tip.whichShow(1);
                    if (editor.isMobile) editor.showdataarea(false);
                },
            },
            {
                text: "在素材区选中此图块", 
                action: (e, h) => {editor.setSelectBoxFromInfo(editor[h.layerMod][editor.pos.y][editor.pos.x]);}
            },
            {
                text: "仅清空此点事件", 
                action: (e, h) => {h.clearPos(false)}
            },
            {
                text: "清空此点及事件", 
                action: (e, h) => {h.clearPos(true)}
            },
        ]);
        this.$registerMode("event", {
            name: "事件编辑",
        });
        this.$work("tiledEditor", "event");
    },
    methods: {
        //////////// 工具函数 ////////////

        blockAt(pos, layer) {
            return editor[layer||"map"][pos.x][pos.y] || {};
        },

        /**
         * 由点击事件获得地图位置
         * @param {Boolean} addViewportOffset 是否加上大地图的偏置
         */
        eToPos: function (e, addViewportOffset) {
            let loc = editor.listen.eToLoc(e, [this.dom.mid, this.dom.mapEdit]);
            var offsetX = 0, offsetY = 0, size = editor.isMobile ? (32 * innerWidth * 0.96 / core.__PIXELS__) : 32;
            if (addViewportOffset) {
                offsetX = core.bigmap.offsetX / 32;
                offsetY = core.bigmap.offsetY / 32;
            }
            return loc.gridding(size).add(offsetX, offsetY);
        },

        //////////// 绘制函数 ////////////

        drawSelectBox() {
            var fg = this.dom.efgCtx;
            fg.strokeStyle = 'rgba(255,255,255,0.7)';
            fg.lineWidth = 4;
            fg.strokeRect(32*editor.pos.x - core.bigmap.offsetX + 4, 32*editor.pos.y - core.bigmap.offsetY + 4, 24, 24);
        },

        registerBadge() {

        },

        drawEventBlock() {
            let fg = this.dom.efg, fgctx = this.dom.efgCtx;
        
            fgctx.clearRect(0, 0, fg.width, fg.height);
            var firstData = editor.game.getFirstData();
            for (var i=0;i<core.__SIZE__;i++) {
                for (var j=0;j<core.__SIZE__;j++) {
                    var color=[];
                    var loc=(i+core.bigmap.offsetX/32)+","+(j+core.bigmap.offsetY/32);
                    if (editor.currentFloorId == firstData.floorId
                        && loc == firstData.hero.loc.x + "," + firstData.hero.loc.y) {
                        fg.textAlign = 'center';
                        editor.game.doCoreFunc('fillBoldText', fg, 'S',
                            32 * i + 16, 32 * j + 28, '#FFFFFF', 'bold 30px Verdana');
                    }
                    if (editor.currentFloorData.events[loc])
                        color.push('#FF0000');
                    if (editor.currentFloorData.autoEvent[loc]) {
                        var x = editor.currentFloorData.autoEvent[loc];
                        for (var index in x) {
                            if (x[index] && x[index].data) {
                                color.push('#FFA500');
                                break;
                            }
                        }
                    }
                    if (editor.currentFloorData.afterBattle[loc])
                        color.push('#FFFF00');
                    if (editor.currentFloorData.changeFloor[loc])
                        color.push('#00FF00');
                    if (editor.currentFloorData.afterGetItem[loc])
                        color.push('#00FFFF');
                    if (editor.currentFloorData.cannotMove[loc])
                        color.push('#0000FF');
                    if (editor.currentFloorData.afterOpenDoor[loc])
                        color.push('#FF00FF');
                    for(var kk=0,cc;cc=color[kk];kk++){
                        fg.fillStyle = cc;
                        fg.fillRect(32*i+8*kk, 32*j+32-8, 8, 8);
                    }
                    var index = this.bindSpecialDoor.enemys.indexOf(loc);
                    if (index >= 0) {
                        fg.textAlign = 'right';
                        editor.game.doCoreFunc("fillBoldText", fg, index + 1,
                            32 * i + 28, 32 * j + 15, '#FF7F00', '14px Verdana');
                    }
                }
            }
        },

        /**
         * 在绘图区格子内画一个随机色块
         */
        fillPos: function (pos) {
            this.dom.euiCtx.fillStyle = '#' + ~~(Math.random() * 8) + ~~(Math.random() * 8) + ~~(Math.random() * 8);
            this.dom.euiCtx.fillRect(pos.x * 32 + 12 - core.bigmap.offsetX, pos.y * 32 + 12 - core.bigmap.offsetY, 8, 8);
        },

        
        //////////// 内置功能 ////////////

        /**
         * this.dom.eui.ondblclick
         * 双击地图可以选中素材
         */
        selectIcon: function (e) {
            if (this.bindSpecialDoor.loc != null) return;
            var loc = this.eToLoc(e);
            var pos = this.locToPos(loc, true);
            editor.setSelectBoxFromInfo(editor[editor.layerMod][pos.y][pos.x]);
            return;
        },

        /**
         * 用于鼠标移出map后清除状态
         */
        clearMapStepStatus: function () {
            if (this.mouseOut) {
                this.mouseOut = false;
                setTimeout(this.clearMapStepStatus.bind(this), 1000);
                return;
            }
            this.holdingPath = 0;
            this.stepPostfix = [];
            this.dom.euiCtx.clearRect(0, 0, core.__PIXELS__, core.__PIXELS__);
            this.startPos = this.endPos = null;
        },

        /**
         * this.dom.eui.onmousedown
         * + 绑定机关门事件的选择怪物
         * + 右键进入菜单
         * + 非绘图时选中
         * + 绘图时画个矩形在那个位置
         */
        map_ondown: function (e) {
            var loc = this.eToLoc(e);
            var pos = this.locToPos(loc, true);
            if (e.button == 2) {
            }
            if (!selectBox.isSelected()) {
                editor_mode.onmode('nextChange');
                editor_mode.onmode('loc');
                //editor_mode.loc();
                //tip.whichShow(1);
                tip.showHelp(6);
                this.startPos = pos;
                this.dom.euiCtx.strokeStyle = '#FF0000';
                this.dom.euiCtx.lineWidth = 3;
                if (editor.isMobile) editor.uifunctions.showMidMenu(e.clientX, e.clientY);
                return false;
            }

            this.holdingPath = 1;
            this.mouseOut = true;
            setTimeout(editor.uifunctions.clearMapStepStatus);
            this.dom.euiCtx.clearRect(0, 0, core.__PIXELS__, core.__PIXELS__);
            this.stepPostfix = [];
            this.stepPostfix.push(pos);
            if (editor.brushMod == 'line') editor.uifunctions.fillPos(pos);
            return false;
        },

        /**
         * this.dom.eui.onmousemove
         * + 非绘图模式时维护起止位置并画箭头
         * + 绘图模式时找到与队列尾相邻的鼠标方向的点画个矩形
         */
        mousemove: function (e) {
            if (this.mode == 'paint') {
                if (this.startPos == null) return;
                //tip.whichShow(1);
                var loc = this.eToLoc(e);
                var pos = this.locToPos(loc, true);
                if (this.endPos != null && this.endPos.x == pos.x && this.endPos.y == pos.y) return;
                if (this.endPos != null) {
                    this.dom.euiCtx.clearRect(Math.min(32 * this.startPos.x - core.bigmap.offsetX, 32 * this.endPos.x - core.bigmap.offsetX),
                        Math.min(32 * this.startPos.y - core.bigmap.offsetY, 32 * this.endPos.y - core.bigmap.offsetY),
                        (Math.abs(this.startPos.x - this.endPos.x) + 1) * 32, (Math.abs(this.startPos.y - this.endPos.y) + 1) * 32)
                }
                this.endPos = pos;
                if (this.startPos != null) {
                    if (this.startPos.x != this.endPos.x || this.startPos.y != this.endPos.y) {
                        core.drawArrow('eui',
                            32 * this.startPos.x + 16 - core.bigmap.offsetX, 32 * this.startPos.y + 16 - core.bigmap.offsetY,
                            32 * this.endPos.x + 16 - core.bigmap.offsetX, 32 * this.endPos.y + 16 - core.bigmap.offsetY);
                    }
                }
                // editor_mode.onmode('nextChange');
                // editor_mode.onmode('loc');
                //editor_mode.loc();
                //tip.whichShow(1);
                // tip.showHelp(6);
                return false;
            }

            if (this.holdingPath == 0) {
                return false;
            }
            this.mouseOut = true;
            var loc = this.eToLoc(e);
            var pos = this.locToPos(loc, true);
            var pos0 = this.stepPostfix[this.stepPostfix.length - 1]
            var directionDistance = [pos.y - pos0.y, pos0.x - pos.x, pos0.y - pos.y, pos.x - pos0.x]
            var max = 0, index = 4;
            for (var i = 0; i < 4; i++) {
                if (directionDistance[i] > max) {
                    index = i;
                    max = directionDistance[i];
                }
            }
            var pos = [{ 'x': 0, 'y': 1 }, { 'x': -1, 'y': 0 }, { 'x': 0, 'y': -1 }, { 'x': 1, 'y': 0 }, false][index]
            if (pos) {
                pos.x += pos0.x;
                pos.y += pos0.y;
                if (editor.brushMod == 'line') editor.uifunctions.fillPos(pos);
                else {
                    var x0 = this.stepPostfix[0].x;
                    var y0 = this.stepPostfix[0].y;
                    var x1 = pos.x;
                    var y1 = pos.y;
                    if (x0 > x1) { x0 ^= x1; x1 ^= x0; x0 ^= x1; }//swap
                    if (y0 > y1) { y0 ^= y1; y1 ^= y0; y0 ^= y1; }//swap
                    // draw rect
                    this.dom.euiCtx.clearRect(0, 0, this.dom.euiCtx.canvas.width, this.dom.euiCtx.canvas.height);
                    this.dom.euiCtx.fillStyle = 'rgba(0, 127, 255, 0.4)';
                    this.dom.euiCtx.fillRect(32 * x0 - core.bigmap.offsetX, 32 * y0 - core.bigmap.offsetY,
                        32 * (x1 - x0) + 32, 32 * (y1 - y0) + 32);
                }
                this.stepPostfix.push(pos);
            }
            return false;
        },

        /**
         * this.dom.eui.onmouseup
         * + 非绘图模式时, 交换首末点的内容
         * + 绘图模式时, 根据画线/画矩形/画tileset 做对应的绘制
         */
        map_onup: function (e) {
            if (!selectBox.isSelected()) {
                //tip.whichShow(1);
                // editor.movePos(this.startPos, this.endPos);
                if (editor.layerMod == 'map')
                    this.exchangePos(this.startPos, this.endPos);
                else
                    editor.exchangeBgFg(this.startPos, this.endPos, editor.layerMod);
                this.startPos = this.endPos = null;
                this.dom.euiCtx.clearRect(0, 0, core.__PIXELS__, core.__PIXELS__);
                return false;
            }
            this.holdingPath = 0;
            if (this.stepPostfix && this.stepPostfix.length) {
                editor.savePreMap();
                if (editor.brushMod !== 'line') {
                    var x0 = this.stepPostfix[0].x;
                    var y0 = this.stepPostfix[0].y;
                    var x1 = this.stepPostfix[this.stepPostfix.length - 1].x;
                    var y1 = this.stepPostfix[this.stepPostfix.length - 1].y;
                    if (x0 > x1) { x0 ^= x1; x1 ^= x0; x0 ^= x1; }//swap
                    if (y0 > y1) { y0 ^= y1; y1 ^= y0; y0 ^= y1; }//swap
                    this.stepPostfix = [];
                    for (var jj = y0; jj <= y1; jj++) {
                        for (var ii = x0; ii <= x1; ii++) {
                            this.stepPostfix.push({ x: ii, y: jj })
                        }
                    }
                }
                var useBrushMode = editor.brushMod == 'tileset';
                if (this.stepPostfix.length == 1 && (editor.uivalues.tileSize[0] > 1 || editor.uivalues.tileSize[1] > 1)) {
                    useBrushMode = true;
                    var x0 = this.stepPostfix[0].x;
                    var y0 = this.stepPostfix[0].y;
                    this.stepPostfix = [];
                    for (var jj = y0; jj < y0 + editor.uivalues.tileSize[1]; ++jj) {
                        for (var ii = x0; ii < x0 + editor.uivalues.tileSize[0]; ++ii) {
                            if (jj >= editor[editor.layerMod].length || ii >= editor[editor.layerMod][0].length) continue;
                            this.stepPostfix.push({ x: ii, y: jj });
                        }
                    }
                }
                if (useBrushMode && core.tilesets.indexOf(editor.info.images) !== -1) {
                    var imgWidth = ~~(core.material.images.tilesets[editor.info.images].width / 32);
                    var x0 = this.stepPostfix[0].x;
                    var y0 = this.stepPostfix[0].y;
                    var idnum = editor.info.idnum;
                    for (var ii = 0; ii < this.stepPostfix.length; ii++) {
                        if (this.stepPostfix[ii].y != y0) {
                            y0++;
                            idnum += imgWidth;
                        }
                        editor[editor.layerMod][this.stepPostfix[ii].y][this.stepPostfix[ii].x] = editor.ids[editor.indexs[idnum + this.stepPostfix[ii].x - x0]];
                    }
                } else {
                    for (var ii = 0; ii < this.stepPostfix.length; ii++)
                        editor[editor.layerMod][this.stepPostfix[ii].y][this.stepPostfix[ii].x] = editor.info;
                }
                // console.log(editor.map);
                if (editor.info.y != null) {
                    editor.uivalues.lastUsed = [editor.info].concat(editor.uivalues.lastUsed.filter(function (e) { return e.id != editor.info.id}));
                    core.setLocalStorage("lastUsed", editor.uivalues.lastUsed);
                }
                editor.updateMap();
                this.holdingPath = 0;
                this.stepPostfix = [];
                this.dom.euiCtx.clearRect(0, 0, core.__PIXELS__, core.__PIXELS__);
            }
            return false;
        },

        // selectFloor_func: function () {
        //     var selectFloor = document.getElementById('selectFloor');
        //     editor.game.getFloorFileList(function (floors) {
        //         var outstr = [];
        //         floors[0].forEach(function (floor) {
        //             outstr.push(["<option value='", floor, "'>", floor, '</option>\n'].join(''));
        //         });
        //         selectFloor.innerHTML = outstr.join('');
        //         selectFloor.value = core.status.floorId;
        //         selectFloor.onchange = function () {
        //             editor_mode.onmode('nextChange');
        //             editor_mode.onmode('floor');
        //             editor.changeFloor(selectFloor.value);
        //         }
        //     });
        // }


        saveFloor: function () {
            editor_mode.onmode('');
            editor.file.saveFloorFile(function (err) {
                if (err) {
                    editor.window.$print(err, 'error');
                    throw (err)
                };
                editor.window.$print('保存成功');
            });
        },



        /////////////////////////////////////////////////////////////////////////////
        
        movePos: function (startPos, endPos, callback) {
            if (!startPos || !endPos) return;
            if (startPos.x == endPos.x && startPos.y == endPos.y) return;
            var copyed = editor.copyFromPos(startPos);
            editor.pasteToPos({map:0, events: {}}, startPos);
            editor.pasteToPos(copyed, endPos);
            editor.updateMap();
            editor.file.saveFloorFile(function (err) {
                if (err) {
                    printe(err);
                    throw(err)
                }
                ;printf('移动事件成功');
                editor.tiledEditor.drawPosSelection();
                if (callback) callback();
            });
        },
        
        exchangePos: function (startPos, endPos, callback) {
            if (!startPos || !endPos) return;
            if (startPos.equalTo(endPos)) return;
            var startInfo = editor.copyFromPos(startPos);
            var endInfo = editor.copyFromPos(endPos);
            editor.pasteToPos(startInfo, endPos);
            editor.pasteToPos(endInfo, startPos);
            editor.updateMap();
            editor.file.saveFloorFile(function (err) {
                if (err) {
                    printe(err);
                    throw(err)
                }
                ;printf('交换事件成功');
                editor.tiledEditor.drawPosSelection();
                if (callback) callback();
            });
        },

        savePreMap: function () {
            var dt = {
                map: editor.map,
                fgmap: editor.fgmap,
                bgmap: editor.bgmap,
            };
            if (editor.uivalues.preMapData.length == 0
                || !core.same(editor.uivalues.preMapData[editor.uivalues.preMapData.length - 1], dt)) {
                editor.uivalues.preMapData.push(core.clone(dt));
                if (editor.uivalues.preMapData.length > editor.uivalues.preMapMax) {
                    editor.uivalues.preMapData.shift();
                }
            }
        },
        
        moveBgFg: function (startPos, endPos, name, callback) {
            if (!startPos || !endPos || ["bgmap","fgmap"].indexOf(name)<0) return;
            if (startPos.x == endPos.x && startPos.y == endPos.y) return;
            editor[name][endPos.y][endPos.x] = editor[name][startPos.y][startPos.x];
            editor[name][startPos.y][startPos.x] = 0;
            editor.updateMap();
            editor.file.saveFloorFile(function (err) {
                if (err) {
                    printe(err);
                    throw(err)
                }
                ;printf('移动图块成功');
                editor.tiledEditor.drawPosSelection();
                if (callback) callback();
            });
        },
        
        exchangeBgFg: function (startPos, endPos, name, callback) {
            if (!startPos || !endPos || ["bgmap","fgmap"].indexOf(name)<0) return;
            if (startPos.x == endPos.x && startPos.y == endPos.y) return;
            var value = editor[name][endPos.y][endPos.x];
            editor[name][endPos.y][endPos.x] = editor[name][startPos.y][startPos.x];
            editor[name][startPos.y][startPos.x] = value;
            editor.updateMap();
            editor.file.saveFloorFile(function (err) {
                if (err) {
                    printe(err);
                    throw(err)
                }
                ;printf('交换图块成功');
                editor.tiledEditor.drawPosSelection();
                if (callback) callback();
            });
        
        },
        
        clearPos: function (clearPos, pos, callback) {
            var fields = Object.keys(editor.file.comment._data.floors._data.loc._data);
            pos = pos || editor.pos;
            this.hideMidMenu();
            editor.savePreMap();
            editor.info = 0;
            editor_mode.onmode('');
            if (clearPos)
                editor.map[pos.y][pos.x]=editor.info;
            editor.updateMap();
            fields.forEach(function(v){
                delete editor.currentFloorData[v][pos.x+','+pos.y];
            })
            editor.file.saveFloorFile(function (err) {
                if (err) {
                    printe(err);
                    throw(err)
                }
                ;printf(clearPos?'清空该点和事件成功':'只清空该点事件成功');
                editor.tiledEditor.drawPosSelection();
                if (callback) callback();
            });
        },

    },
    watch: {
        // 锁定模式提示
        lockMode: function (newValue) {
            if (newValue) this.$print('锁定模式开启时点击空白处将不再自动保存，请谨慎操作。');
        },
        // tileset模式提示
        brushMod: function (newValue) {
            if (newValue != 'tileset') return;
            if (!core.getLocalStorage('alertTileMode') &&
                !confirm("从V2.6.6开始，tileset贴图模式已被废弃。\n请右键额外素材，并输入所需要绘制的宽高，然后单击地图以绘制一个区域。\n\n点取消将不再显示此提示。")) {
                core.setLocalStorage('alertTileMode', true);
            }
            tip.msgs[11] = String('tileset贴图模式下可以按选中tileset素材，并在地图上拖动来一次绘制一个区域');
            tip.whichShow(12);
        },
        layerMod: function (newValue) {
            if (newValue == 'map') {
                [this.dom.bgc, this.dom.evc, this.dom.ev2c].forEach(function (x) {
                    x.style.opacity = 1;
                });
            } else {
                [this.dom.bgc, this.dom.evc, this.dom.ev2c].forEach(function (x) {
                    x.style.opacity = 0.3;
                });
            }
        }
    },
}