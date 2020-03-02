export var info = {
    __author__: "ckcz123",
}

export var editorInjection = function() {
    // 绑定出生点
    editor.service.register('tiledEditor', 'bindStartPoint', {
        mounted(h) {
            h.$refs.contextmenu.inject({
                text: "绑定起始点为此点",
                condition: (e, h) => !h.blockAt(e.pos).id,
                action: function(e, h) {
                    let x = e.pos.x, y = e.pos.y;
                    editor.mode.onmode('tower');
                    editor.mode.addAction(["change", "['firstData']['floorId']", editor.currentFloorId]);
                    editor.mode.addAction(["change", "['firstData']['hero']['loc']['x']", x]);
                    editor.mode.addAction(["change", "['firstData']['hero']['loc']['y']", y]);
                    editor.mode.onmode('save', function () {
                        core.firstData.floorId = editor.currentFloorId;
                        core.firstData.hero.loc.x = x;
                        core.firstData.hero.loc.y = y;
                        editor.tiledEditor.drawPosSelection();
                        editor.tiledEditor.drawEventBlock();
                        editor.mode.tower();
                        printf('绑定初始点成功');
                    });
                },
            });
        }
    });

    // 绑定楼传事件
    editor.service.register('tiledEditor', 'bindChangeFloor', {
        data: {
            rules: {
                upFloor: {
                    text: '绑定上楼事件', event: { "floorId": ":next", "stair": "upFloor" }
                },
                upFloor: {
                    text: '绑定下楼事件', event: { "floorId": ":next", "stair": "downFloor" }
                },
                leftPortal: {
                    event: { "floorId": ":next", "stair": ":symmetry_x" },
                },
                rightPortal: {
                    event: { "floorId": ":next", "stair": ":symmetry_x" },
                },
                upPortal: {
                    event: { "floorId": ":next", "stair": ":symmetry_y" },
                },
                downPortal: {
                    event: { "floorId": ":next", "stair": ":symmetry_y" },
                },
            }
        },
        mounted(h) {
            let rules = this.rules;
            h.$refs.contextmenu.inject({
                text: (e, h) => rules[h.blockAt(h.pos).id].text || "绑定楼传事件",
                condition: (e, h) => h.blockAt(h.pos).id in rules,
                action: function(e, h) {
                    let loc = h.pos.x + "," + h.pos.y,
                        blockId = h.blockAt(h.pos).id;
                    editor.currentFloorData.changeFloor[loc] = rules[blockId].event;
                    editor.file.saveFloorFile(function (err) {
                        if (err) {
                            printe(err);
                            throw (err)
                        }
                        editor.tiledEditor.drawPosSelection();
                        editor.tiledEditor.drawEventBlock();
                        editor_mode.showMode('loc');
                        printf('添加楼梯事件成功');
                    });
                    return true;
                },
            });
        }
    });

    // 绑定机关门
    editor.service.register('tiledEditor', 'bindSpecialDoor', {
        data: {
            doorLoc: null,
            enemys: [],
        },
        mounted(h) {
            h.$refs.contextmenu.inject([
                {
                    text: '绑定机关门事件',
                    condition: (e, h) => h.blockAt(h.pos).id == 'specialDoor',
                    action: this.startBind,
                },
                {
                    text: '取消此次绑定',
                    condition: (e, h) => h.blockAt(h.pos).id == 'specialDoor',
                    action: this.clear,
                },
            ]);
            h.$registerMode("bindDoor", {
                name: "机关门绑定",
                task: true,
                help: "请点击选取要绑定的怪物, 选好后点击机关门完成, 右键菜单可取消绑定",
                onClick: this.selectBind,
                beforeContextmenu: function(e) {
                    h.selectPos(h.eToPos(e));
                },
                unactive: this.clear,
            });
            h.registerBadge("bindDoor.keeper", function(fg) {
                let cnt = 1;
                for (let locstr of this.enemys) {
                    let pos = new editor.util.pos(locstr, ",");
                    editor.game.doCoreFunc("fillBoldText", fg, cnt,
                        32 * pos + 28, 32 * j + 15, '#FF7F00', '14px Verdana');
                }
                var index = this.enemys.indexOf(loc);
                if (index >= 0) {
                    fg.textAlign = 'right';
                }
            });
        },
        methods: {
            startBind(e, h) {
                this.doorLoc = h.pos.copy();
                this.enemys = [];
            },
            selectBind(e) {
                let pos = this.$host.eToPos(e), id = this.$host.blockAt(pos).id;
                // 检测是否是怪物
                if (!id) return false;
                if (editor.game.getEnemy(id)) {
                    let locstr = pos.format(","), index = this.enemys.indexOf(locstr);
                    if (index >= 0) this.enemys.splice(index, 1);
                    else this.enemys.push(locstr);
                    this.$host.drawEventBlock();
                }
                else if (id == 'specialDoor') {
                    this.completeBind();
                }
                return false;
            },
            completeBind() {
                if (this.doorLoc == null) return;
                // 添加机关门自动事件
                let doorFlag = "flag:door_" + editor.currentFloorId + "_" + this.doorLoc.format("_");
                editor.currentFloorData.autoEvent[this.doorLoc.format("_")] = {
                    '0': {
                        "condition": doorFlag + "==" + this.enemys.length,
                        "currentFloor": true,
                        "priority": 0,
                        "delayExecute": false,
                        "multiExecute": false,
                        "data": [
                            {"type": "openDoor"}
                        ]
                    }
                };
                this.enemys.forEach(function (loc) {
                    editor.currentFloorData.afterBattle[loc] = [
                        {"type": "addValue", "name": doorFlag, "value": "1"}
                    ]
                });
                editor.file.saveFloorFile(function (err) {
                    if (err) {
                        printe(err);
                        throw (err)
                    }
                    editor.tiledEditor.drawEventBlock();
                    editor.tiledEditor.drawPosSelection();
                    editor_mode.showMode('loc');
                    editor.window.$print('绑定机关门事件成功');
                });
                this.$host.$finishTask();
            },
            clear() {
                this.loc = null;
                this.enemys = [];
                this.$host.updateBadge();
            },
            showMidMenu: function (x, y) {
                editor.uivalues.lastRightButtonPos = JSON.parse(JSON.stringify(
                    [editor.pos, editor.uivalues.lastRightButtonPos[0]]
                ));
                // --- copy
                editor.uivalues.lastCopyedInfo = [editor.copyFromPos(), editor.uivalues.lastCopyedInfo[0]];
                var locStr = '(' + editor.uivalues.lastRightButtonPos[1].x + ',' + editor.uivalues.lastRightButtonPos[1].y + ')';
            },
        }
    });
}
