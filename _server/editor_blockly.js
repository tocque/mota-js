/**
 * editor_blockly.js Blockly编辑器类
 */

 /** blockly钩子, 当blockly模块加载完毕时resolve */
let blocklyHook = (new class BlocklyProxy {

    async load() {
        try {
            const loader = [
                fetch('./_server/blockly/MotaAction.g4'),
                import('./blockly/block_config.js'),
                new Promise((res, rej) => { // 等待blockly组件加载完毕
                    document.getElementById('blocklyLang').onload = res;
                })
            ];
            const [motaAction, config] = await Promise.all(loader);
            this.config = config;
            await import('./blockly/override.js');
            this.runOne(motaAction);
        } catch(e) {
            // 此时window可能未mount
            console.error(e);
            alert("图块描述文件加载失败, 请在'启动服务.exe'中打开编辑器, 错误信息"+e);
        }
        return this;
    }

    runOne(grammerFile) {
        //var printf = console.log;
        //var printf = function(){};
        converter = new Converter().init();
        converter.generBlocks(grammerFile);
        //printf(converter.blocks);
        converter.renderGrammerName();
        //converter.generToolbox();
        converter.generMainFile();
        //printf(converter.mainFile.join(''));
        //console.log(converter);
        editor.util.mountJs(converter.mainFile[5]);
    }

    /**
     * 将blockly注入到DOM上
     * @param {HTMLElement} mountElm blockly的挂载点
     * @param {Vue} vm 对应的vue实例
     * 为了接收对应信息 vm需要声明一些属性和方法
     * +    error方法: 报错, 
     * +    onUseBlock, onDoubleClickBlock方法: 响应用户操作
     * +    getJson方法: 获得解析出的json
     * +    entryType属性: 入口块类别,
     */
    inject(mountElm, vm) {
        const blocklyDiv = document.createElement('div');
        mountElm.appendChild(blocklyDiv);
        blocklyDiv.classList.add("blocklyDiv");
        const { toolbox, customs } = this.createToolbox(this.config.blockList());
        const workspace = Blockly.inject(blocklyDiv, {
            media: '_server/blockly/media/',
            toolbox,
            zoom:{
                controls: true,
                wheel: false,//滚轮改为上下(shift:左右)翻滚
                startScale: 1.0,
                maxScale: 3,
                minScale: 0.3,
                scaleSpeed: 1.08
            },
            trashcan: false,
        });
        setListener(workspace, customs, {mountElm, blocklyDiv, vm});
        MotaActionFunctions.workspace = function() {
            return workspace;
        }
        this.overrideMotaActionFunctions();
        return workspace; 
    }

    /**
     * 从block块列表生成工具栏
     * @param blockList block块列表 
     * @returns {{toolbox: HTMLElement, customs: Array<Function>}} 
     */
    createToolbox(blockList) {
        const toolboxgap = '<sep gap="5"></sep>'
        const toolbox = document.createElement('xml');
        const customs = [];
        
        //xml_text = MotaActionFunctions.actionParser.parse(obj,type||'event')
        //MotaActionBlocks['idString_e'].xmlText()
        for (let name in blockList) {
            const category = document.createElement('category');
            category.setAttribute('name', name);
            if (blockList[name] instanceof Array) {
                toolbox.innerHTML = blockList[name].join(toolboxgap);
            } else {
                node.setAttribute('custom', blockList[name].name);
                category.innerHTML = '<label text="占位符"></label>';
                customs.push(blockList[name]);
            }
            toolbox.appendChild(category);
        }
        return { toolbox, customs };
    }
    
    /**
     * 设置侦听器
     * @param {Blockly.WorkspaceSvg} workspace 生成的工作区
     * @param {Array<Function>} customs 自定义行为列表
     * @param {{mountElm: HTMLElement, blocklyDiv: HTMLElement, vm: Vue}  
     */
    setListener(workspace, customs, {mountElm, blocklyDiv, vm}) {
        for (let custom of customs) {
            workspace.registerToolboxCategoryCallback(custom.name, custom);
        }

        const onresize = function(e) {
            blocklyDiv.style.width = mountElm.offsetWidth + 'px';
            blocklyDiv.style.height = mountElm.offsetHeight + 'px';
            Blockly.svgResize(workspace);
        };
        if(!editor.isMobile) {
            window.addEventListener('resize', onresize, false);
        }
        onresize();

        blocklyDiv.onmousewheel = function(e) {
            //console.log(e);
            e.preventDefault();
            const hvScroll = e.shiftKey?'hScroll':'vScroll';
            const mousewheelOffsetValue=20/380*workspace.scrollbar[hvScroll].handleLength_*3;
            workspace.scrollbar[hvScroll].handlePosition_+=( ((e.deltaY||0)+(e.detail||0)) >0?mousewheelOffsetValue:-mousewheelOffsetValue);
            workspace.scrollbar[hvScroll].onScroll_();
            workspace.setScale(workspace.scale);
        }

        let doubleClickCheck = [[0,'abc']];
        function omitedcheckUpdateFunction(event) {
            if(event.type === 'create') {
                vm.onUseBlock(event.blockId);
            }
            if(event.type === 'ui') {
                const newClick = [new Date().getTime(), event.blockId];
                const lastClick = doubleClickCheck.shift();
                doubleClickCheck.push(newClick);
                if(newClick[0]-lastClick[0]<500 && newClick[1]===lastClick[1]) {
                    vm.onDoubleClickBlock(newClick[1]);
                }
            }
            if(workspace.topBlocks_.length >= 2) {
                vm.error('入口方块只能有一个');
                return;
            } else if (workspace.topBlocks_.length == 1) {
                const eventType = vm.entryType;
                const blockType = workspace.topBlocks_[0].type;
                if(blockType !== eventType+'_m') {
                    vm.error('入口方块类型错误');
                    return;
                }
            }
            try {
                const code = Blockly.JavaScript.workspaceToCode(workspace).replace(/\\\\(i|c|d|e)/g, '\\\\\\\\$1');
                vm.setJson(code);
            } catch (error) {
                vm.setValue(String(error));
                if (error instanceof OmitedError){
                    const blockName = error.blockName;
                    const varName = error.varName;
                    const block = error.block;
                }
                // console.log(error);
            }
        }

        workspace.addChangeListener(omitedcheckUpdateFunction);

        workspace.addChangeListener(Blockly.Events.disableOrphans);
    }

    /**
     * 待重构的方法, 此处方法运行过一次后将不能正常解析块, 故目前只能Inject一次
     */
    overrideMotaActionFunctions() {
        // 因为在editor_blockly.parse里已经HTML转义过一次了,所以这里要覆盖掉以避免在注释中出现&lt;等
        MotaActionFunctions.xmlText = function (ruleName,inputs,isShadow,comment) {
            let rule = MotaActionBlocks[ruleName];
            const blocktext = isShadow?'shadow':'block';
            let xmlText = [];
            xmlText.push('<'+blocktext+' type="'+ruleName+'">');
            if(!inputs)inputs=[];
            for (let ii=0,inputType;inputType=rule.argsType[ii];ii++) {
                const input = inputs[ii];
                const noinput = (input===null || input===undefined);
                if(noinput && inputType==='field') continue;
                let _input = '';
                if(noinput) input = '';
                if(inputType!=='field') {
                    let subList = false;
                    let subrulename = rule.args[ii];
                    subrulename=subrulename.split('_').slice(0,-1).join('_');
                    let subrule = MotaActionBlocks[subrulename];
                    if (subrule instanceof Array) {
                        subrulename=subrule[subrule.length-1];
                        subrule = MotaActionBlocks[subrulename];
                        subList = true;
                    }
                    _input = subrule.xmlText([],true);
                    if(noinput && !subList && !isShadow) {
                        //无输入的默认行为是: 如果语句块的备选方块只有一个,直接代入方块
                        input = subrule.xmlText();
                    }
                }
                xmlText.push('<'+inputType+' name="'+rule.args[ii]+'">');
                xmlText.push(_input+input);
                xmlText.push('</'+inputType+'>');
            }
            if(comment){
                xmlText.push('<comment>');
                xmlText.push(comment);
                xmlText.push('</comment>');
            }
            const next = inputs[rule.args.length];
            if (next) {//next
                xmlText.push('<next>');
                xmlText.push(next);
                xmlText.push('</next>');
            }
            xmlText.push('</'+blocktext+'>');
            return xmlText.join('');
        }
    }

    initBlockly() {
        

        var blocklyArea = document.getElementById('blocklyArea');
        var blocklyDiv = document.getElementById('blocklyDiv');

        
        
        
        //Blockly.svgResize(workspace);

        //Blockly.bindEventWithChecks_(workspace.svgGroup_,"wheel",workspace,function(e){});
        

        

        editor_blockly.workspace = workspace;

    }

    showXML() {
        const xml = Blockly.Xml.workspaceToDom(editor_blockly.workspace);
        console.log(Blockly.Xml.domToPrettyText(xml));
        console.log(Blockly.Xml.domToText(xml));
        console.log(xml);
    }
}).load();

export default {
    template: /* HTML */`
    <el-dialog
        :visible.sync="active"
        class="blocklyEditor"
        :class="{show: active}"
        width="80%"
        :before-close="hide">
        <div slot="title" class="toolbar">
            <span>事件编辑器</span>
            <div class="button-group">
                <li data-btn="confirm">确定</li>
                <li data-btn="parse">解析</li>
                <li data-btn="cancal">取消</li>
                <li>
                    <mt-search 
                        placeholder="搜索图块"
                        @focus="reopenToolbox(-1)"
                        @input="reopenToolbox"
                        v-model="searchKeyword"
                    ></mt-search>
                </li>
                <li data-btn="select">地图选点</li>
                <li data-btn="flagSearch">变量搜索</li>
                <li data-btn="chinese">中文名替换</li>
                <li data-btn="switch">显示</li>
            </div>
        </div>
        <div ref="blocklyArea"></div>
        <code-editor ref="json" lang="json"></code-editor>
    </el-dialog>
    `,
    data() {
        return {
            node: {},
            entryType: '', // 入口类型
            blocklyReplace: false,
            active: false,
            completeItems: [],
            searchKeyword: "",
        }
    },
    async created() {
        this.blocklyReplace = !editor.userdata.get("disableBlocklyReplace", false);

        this.codeAreaHL = {};
        
        await blocklyHook;
        editor.window.openBlockly = this.import;
        MotaActionFunctions.disableReplace = !blockly.blocklyReplace;
    },
    async mounted() {
        this.workspace = (await blocklyHook).inject(this.$refs.blocklyArea);
    },
    methods: {
        triggerReplace() {
            this.blocklyReplace = !replaceCheckbox.checked;
            // core.setLocalStorage("disableBlocklyReplace", !replaceCheckbox.checked);
            if (MotaActionFunctions) MotaActionFunctions.disableReplace = !replaceCheckbox.checked;
            alert("已" + (replaceCheckbox.checked ? "开启" : "关闭") + "中文变量名替换！\n关闭并重开事件编辑器以生效。");
        },
    
        runCode() {
            // Generate JavaScript code and run it.
            window.LoopTrap = 1000;
            Blockly.JavaScript.INFINITE_LOOP_TRAP =
                'if (--window.LoopTrap == 0) throw "Infinite loop.";\n';
            var code = Blockly.JavaScript.workspaceToCode(editor_blockly.workspace);
            Blockly.JavaScript.INFINITE_LOOP_TRAP = null;
            try {
                eval('obj=' + code);
                console.log(obj);
            } catch (e) {
                alert(e);
            }
        },
    
        parse(entryType) {
            MotaActionFunctions.parse(
                eval('obj=' + codeAreaHL.getValue().replace(/[<>&]/g, function (c) {
                    return {'<': '&lt;', '>': '&gt;', '&': '&amp;'}[c];
                }).replace(/\\(r|f|i|c|d|e)/g,'\\\\$1')),
                entryType
            );
        },
    
        import(node, type) {
            this.node = node;
            this.codeAreaHL.setValue(node.value);
            this.entryType = type;
            blocklyHook.parse(type);
            this.active = true;
            return true;
        },
    
        show() {
            for (let node of blocklyWidgetDiv) {
                node.style.zIndex = 201;
                node.style.opacity = '';
            }
        },
    
        hide() {
            for (let node of blocklyWidgetDiv) {
                node.style.zIndex = -1;
                node.style.opacity = 0;
            }
        },
    
        cancel() {
            this.node = null;
            this.hide();
        },
    
        setValue() {
            this.node = null;
            this.hide();
        },
    
        confirm() {
            if (!this.node) return;
            if (editor_blockly.workspace.topBlocks_.length >= 2) {
              codeAreaHL.setValue('入口方块只能有一个');
              return;
            }
            if (editor_blockly.workspace.topBlocks_.length == 1) {
                var blockType = editor_blockly.workspace.topBlocks_[0].type;
                if(blockType !== this.entryType + '_m'){
                    codeAreaHL.setValue('入口方块类型错误'); // <- 弹出框
                    return;
                }
            }
            if (codeAreaHL.getValue() === '') {
                this.setValue(this.entryType === 'shop' ? '[]' : 'null');
                return;
            }
            var code = Blockly.JavaScript.workspaceToCode(editor_blockly.workspace);
            code = code.replace(/\\(i|c|d|e)/g, '\\\\$1');
            eval('var obj=' + code);
            if (this.checkAsync(obj) && confirm("警告！存在不等待执行完毕的事件但却没有用【等待所有异步事件处理完毕】来等待" +
                "它们执行完毕，这样可能会导致录像检测系统出问题。\n你要返回修改么？")) return;
            this.setValue(JSON.stringify(obj));
        },
    
        // 检查"不等待处理完毕"
        checkAsync(obj) {
            if (!(obj instanceof Array)) return false;
            var hasAsync = false;
            for (var i = 0; i < obj.length; ++i) {
                var one = obj[i];
                if (one.type == 'if' && (this.checkAsync(one['true']) || this.checkAsync(one['false'])))
                    return true;
                if ((one.type == 'while' || one.type == 'dowhile') && this.checkAsync(one.data))
                    return true;
                if (one.type == 'if' && (this.checkAsync(one.yes) || this.checkAsync(one.no)))
                    return true;
                if (one.type == 'choices') {
                    var list = one.choices;
                    if (list instanceof Array) {
                        for (var j = 0; j < list.length; j++) {
                            if (this.checkAsync(list[j].action)) return true;
                        }
                    }
                }
                if (one.type == 'switch') {
                    var list = one.caseList;
                    if (list instanceof Array) {
                        for (var j = 0; j < list.length; j++) {
                            if (this.checkAsync(list[j].action)) return true;
                        }
                    }
                }
                if (one.async && one.type != 'animate') hasAsync = true;
                if (one.type == 'waitAsync') hasAsync = false;
            }
            return hasAsync;
        },
    
        previewBlock(b) {
            let types;
            if (b && types.indexOf(b.type)>=0) {
                try {
                    var code = "[" + Blockly.JavaScript.blockToCode(b).replace(/\\(i|c|d|e)/g, '\\\\$1') + "]";
                    eval("var obj="+code);
                    // console.log(obj);
                    if (obj.length > 0 && b.type.startsWith(obj[0].type)) {
                        let previewObj;
                        if (b.type == 'previewUI_s') previewObj = obj[0].action;
                        else previewObj = obj[0];
                        this.UIpreviewer.show(previewObj);
                    }
                } catch (e) {main.log(e);}
                return true;
            }
            return false;
        },
    
        doubleClickBlock(blockId) {
            var b = this.workspace.getBlockById(blockId);
    
            if (previewBlock(b)) return;
    
            if (b && b.type in selectPointBlocks) { // selectPoint
                this.selectPoint();
                return;
            }
    
            var f = b ? blocklyHook.textStringDict[b.type] : null;
            if (f) {
                var value = b.getFieldValue(f);
                //多行编辑
                editor_multi.multiLineEdit(value, b, f, {'lint': f === 'RawEvalString_0'}, function (newvalue, b, f) {
                    if (textStringDict[b.type] !== 'RawEvalString_0') {
                    }
                    b.setFieldValue(newvalue.split('\n').join('\\n'), f);
                });
            }
        },
    
        addIntoLastUsedType(blockId) {
            var b = this.workspace.getBlockById(blockId);
            if(!b)return;
            var blockType = b.type;
            if(!blockType || blockType.indexOf("_s")!==blockType.length-2 || blockType==='pass_s')return;
            this.lastUsedType = this.lastUsedType.filter(function (v) {return v!==blockType;});
            if (this.lastUsedType.length >= this.lastUsedTypeNum)
                this.lastUsedType.pop();
            this.lastUsedType.unshift(blockType);
    
            document.getElementById("searchBlock").value='';
        },
    
        // Index from 1 - 9
        openToolbox(index) {
            if (index < 0) index += editor_blockly.workspace.toolbox_.tree_.children_.length;
            editor_blockly.workspace.toolbox_.tree_.setSelectedItem(editor_blockly.workspace.toolbox_.tree_.children_[index]);
        },
    
        reopenToolbox(index) {
            if (index < 0) index += editor_blockly.workspace.toolbox_.tree_.children_.length;
            editor_blockly.workspace.toolbox_.tree_.setSelectedItem(editor_blockly.workspace.toolbox_.tree_.children_[index]);
            editor_blockly.workspace.getFlyout_().show(editor_blockly.workspace.toolbox_.tree_.children_[index].blocks);
        },
    
        closeToolbox() {
            editor_blockly.workspace.toolbox_.clearSelection();
        },
    
        searchBlock(value) {
            if (value == null) value = searchInput.value;
            value = value.toLowerCase();
            if (value == '') return editor_blockly.lastUsedType;
            let results = [];
            for (let name in MotaActionBlocks) {
                if (typeof name !== 'string' || name.indexOf("_s") !== name.length-2) continue;
                const block = MotaActionBlocks[name];
                if(block && block.json) {
                    if ((block.json.type||"").toLowerCase().indexOf(value)>=0
                        || (block.json.message0||"").toLowerCase().indexOf(value)>=0
                        || (block.json.tooltip||"").toLowerCase().indexOf(value)>=0) {
                        results.push(name);
                        if (results.length>=editor_blockly.lastUsedTypeNum)
                            break;
                    }
                }
            }
    
            return results.length == 0 ? editor_blockly.lastUsedType : results;
        },
    
        // ------ select point ------
    
        // id: [x, y, floorId, forceFloor]
        
    
        selectPoint() {
            var block = Blockly.selected, arr = null;
            var floorId = editor.currentFloorId, pos = editor.pos, x = pos.x, y = pos.y;
            if (block != null && block.type in selectPointBlocks) {
                arr = selectPointBlocks[block.type];
                var xv = parseInt(block.getFieldValue(arr[0])), yv = parseInt(block.getFieldValue(arr[1]));
                if (block.type == 'animate_s') {
                    var v = block.getFieldValue(arr[0]).split(",");
                    xv = parseInt(v[0]); yv = parseInt(v[1]);
                }
                if (!isNaN(xv)) x = xv;
                if (!isNaN(yv)) y = yv;
                if (arr[2] != null) floorId = block.getFieldValue(arr[2]) || floorId;
            }
            editor.uievent.selectPoint(floorId, x, y, arr && arr[2] == null, function (fv, xv, yv) {
                if (!arr) return;
                if (arr[2] != null) {
                    if (fv != editor.currentFloorId) block.setFieldValue(fv, arr[2]);
                    else block.setFieldValue(arr[3] ? fv : "", arr[2]);
                }
                if (block.type == 'animate_s') {
                    block.setFieldValue(xv+","+yv, arr[0]);
                }
                else {
                    block.setFieldValue(xv+"", arr[0]);
                    block.setFieldValue(yv+"", arr[1]);
                }
                if (block.type == 'changeFloor_m') {
                    block.setFieldValue("floorId", "Floor_List_0");
                    block.setFieldValue("loc", "Stair_List_0");
                }
            });
        },
    }
}
