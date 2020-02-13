
export default {
    template: /* HTML */`
    <div id="iconLib" @mousedown="ondown">
        <div id="iconImages"></div>
        <div id="selectBox">
            <div 
                id='dataSelection'
                v-show="selected"
            ></div>
        </div>
        <button id="iconExpandBtn" @click="setFold">{{ folded ? "展开素材区" : "折叠素材区" }}</button>
    </div>`,
    props: {
        selection: Number,
    },
    model: {
        prop: 'selection',
        event: 'select'
    },
    data: function() {
        return {
            scrollBarHeight :0,
            folded: false,
            foldPerCol: 50,
            selected: false,
        }
    },
    created: function() {
        this.folded = editor.userdata.get('folded', false);
        this.foldPerCol = editor.userdata.get('foldPerCol', 50);
        //oncontextmenu = function (e) { e.preventDefault() }
    },
    mounted: function() {
        //this.drawInitData(core.icons.icons);
    },
    methods: {
        setFold: function () {
            if (this.folded) {
                if (confirm("你想要展开素材吗？\n展开模式下将显示全素材内容。")) {
                    core.setLocalStorage('folded', false);
                    window.location.reload();
                }
            } else {
                var perCol = parseInt(prompt("请输入折叠素材模式下每列的个数：", "50")) || 0;
                if (perCol > 0) {
                    core.setLocalStorage('foldPerCol', perCol);
                    core.setLocalStorage('folded', true);
                    window.location.reload();
                }
            }
        },
        drawInitData: function (icons) {
            var ratio = 1;
            var images = core.material.images;
            var maxHeight = 700;
            var sumWidth = 0;
            editor.widthsX = {};
            // editor.uivalues.folded = true;
            // var imgNames = Object.keys(images);  //还是固定顺序吧；
            editor.uivalues.lastUsed = core.getLocalStorage("lastUsed", []);
            var imgNames = ["terrains", "animates", "enemys", "enemy48", "items", "npcs", "npc48", "autotile"];
        
            for (var ii = 0; ii < imgNames.length; ii++) {
                var img = imgNames[ii], tempy = 0;
                if (img == 'autotile') {
                    var autotiles = images[img];
                    for (var im in autotiles) {
                        tempy += autotiles[im].height;
                    }
                    var tempx = this.folded ? 32 : 3 * 32;
                    editor.widthsX[img] = [img, sumWidth / 32, (sumWidth + tempx) / 32, tempy];
                    sumWidth += tempx;
                    maxHeight = Math.max(maxHeight, tempy);
                    continue;
                }
                var width = images[img].width, height = images[img].height, mh = height;
                if (this.folded) {
                    var per_height = (img == 'enemy48' || img == 'npc48' ? 48 : 32);
                    width = Math.ceil(height / per_height / editor.uivalues.foldPerCol) * 32;
                    if (width > 32) mh = per_height * editor.uivalues.foldPerCol;
                }
                editor.widthsX[img] = [img, sumWidth / 32, (sumWidth + width) / 32, height];
                sumWidth += width;
                maxHeight = Math.max(maxHeight, mh + 64);
            }
            var tilesets = images.tilesets;
            for (var ii in core.tilesets) {
                var img = core.tilesets[ii];
                editor.widthsX[img] = [img, sumWidth / 32, (sumWidth + tilesets[img].width) / 32, tilesets[img].height];
                sumWidth += tilesets[img].width;
                maxHeight = Math.max(maxHeight, tilesets[img].height);
            }
        
            var fullWidth = ~~(sumWidth * ratio);
            var fullHeight = ~~(maxHeight * ratio);
        
            /*
            if (fullWidth > edata.width) edata.style.width = (edata.width = fullWidth) / ratio + 'px';
            edata.style.height = (edata.height = fullHeight) / ratio + 'px';
            */
            var iconImages = document.getElementById('iconImages');
            iconImages.style.width = (iconImages.width = fullWidth) / ratio + 'px';
            iconImages.style.height = (iconImages.height = fullHeight) / ratio + 'px';
            var drawImage = function (image, x, y) {
                image.style.left = x + 'px';
                image.style.top = y + 'px';
                iconImages.appendChild(image);
            }
        
            var nowx = 0, nowy = 0;
            for (var ii = 0; ii < imgNames.length; ii++) {
                var img = imgNames[ii];
                if (img == 'terrains') {
                    (function(image,nowx){
                        if (image.complete) {
                            drawImage(image, nowx, 32);
                            core.material.images.airwall = image;
                            delete(editor.airwallImg);
                        } else image.onload = function () {
                            drawImage(image, nowx, 32);
                            core.material.images.airwall = image;
                            delete(editor.airwallImg);
                            editor.updateMap();
                        }
                    })(editor.airwallImg,nowx);
                    if (this.folded) {
                        // --- 单列 & 折行
                        var subimgs = core.splitImage(images[img], 32, editor.uivalues.foldPerCol * 32);
                        var frames = images[img].width / 32;
                        for (var i = 0; i < subimgs.length; i+=frames) {
                            drawImage(subimgs[i], nowx, i==0?2*32:0);
                            nowx += 32;
                        }
                    }
                    else {
                        drawImage(images[img], nowx, 32*2);
                        nowx += images[img].width;
                    }
                    continue;
                }
                if (img == 'autotile') {
                    var autotiles = images[img];
                    var tempx = this.folded ? 32 : 96;
                    for (var im in autotiles) {
                        var subimgs = core.splitImage(autotiles[im], tempx, autotiles[im].height);
                        drawImage(subimgs[0], nowx, nowy);
                        nowy += autotiles[im].height;
                    }
                    nowx += tempx;
                    continue;
                }
                if (this.folded) {
                    // --- 单列 & 折行
                    var per_height = img.endsWith('48') ? 48 : 32;
                    var subimgs = core.splitImage(images[img], 32, editor.uivalues.foldPerCol * per_height);
                    var frames = images[img].width / 32;
                    for (var i = 0; i < subimgs.length; i+=frames) {
                        drawImage(subimgs[i], nowx, 0);
                        nowx += 32;
                    }
                }
                else {
                    drawImage(images[img], nowx, 0);
                    nowx += images[img].width;
                }
            }
            for (var ii in core.tilesets) {
                var img = core.tilesets[ii];
                drawImage(tilesets[img], nowx, 0);
                nowx += tilesets[img].width;
            }
            //editor.mapInit();
        },
        ondown: function (e) {
            e.stopPropagation();
            e.preventDefault();
            if (!editor.isMobile && e.clientY >= this.$el.offsetHeight - editor.ui.values.scrollBarHeight) return;
            var scrollLeft = document.documentElement.scrollLeft || document.body.scrollLeft;
            var scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
            var loc = {
                'x': scrollLeft + e.clientX + this.$el.scrollLeft - right.offsetLeft - this.$el.offsetLeft,
                'y': scrollTop + e.clientY + this.$el.scrollTop - right.offsetTop - this.$el.offsetTop,
                'size': 32
            };
            editor.uivalues.tileSize = [1,1];
            var pos = editor.uifunctions.locToPos(loc);
            for (var spriter in editor.widthsX) {
                if (pos.x >= editor.widthsX[spriter][1] && pos.x < editor.widthsX[spriter][2]) {
                    var ysize = spriter.endsWith('48') ? 48 : 32;
                    loc.ysize = ysize;
                    pos.images = editor.widthsX[spriter][0];
                    pos.y = ~~(loc.y / loc.ysize);
                    if (!this.folded && core.tilesets.indexOf(pos.images) == -1) pos.x = editor.widthsX[spriter][1];
                    var autotiles = core.material.images['autotile'];
                    if (pos.images == 'autotile') {
                        var imNames = Object.keys(autotiles);
                        if ((pos.y + 1) * ysize > editor.widthsX[spriter][3])
                            pos.y = ~~(editor.widthsX[spriter][3] / ysize) - 4;
                        else {
                            for (var i = 0; i < imNames.length; i++) {
                                if (pos.y >= 4 * i && pos.y < 4 * (i + 1)) {
                                    pos.images = imNames[i];
                                    pos.y = 4 * i;
                                }
                            }
                        }
                    }
                    else {
                        var height = editor.widthsX[spriter][3], col = height / ysize;
                        if (this.folded && core.tilesets.indexOf(pos.images) == -1) {
                            col = (pos.x == editor.widthsX[spriter][2] - 1) ? ((col - 1) % editor.uivalues.foldPerCol + 1) : editor.uivalues.foldPerCol;
                        }
                        if (spriter == 'terrains' && pos.x == editor.widthsX[spriter][1]) col += 2;
                        pos.y = Math.min(pos.y, col - 1);
                    }
    
                    this.selected = true;
                    // console.log(pos,core.material.images[pos.images].height)
                    this.selectionStyle.left = pos.x * 32 + 'px';
                    this.selectionStyle.top = pos.y * ysize + 'px';
                    this.selectionStyle.height = ysize - 6 + 'px';
    
                    if (pos.x == 0 && pos.y == 0) {
                        // editor.info={idnum:0, id:'empty','images':'清除块', 'y':0};
                        editor.info = 0;
                    } else if (pos.x == 0 && pos.y == 1) {
                        editor.info = editor.ids[editor.indexs[17]];
                    } else {
                        if (autotiles[pos.images]) editor.info = { 'images': pos.images, 'y': 0 };
                        else if (core.tilesets.indexOf(pos.images) != -1) editor.info = { 'images': pos.images, 'y': pos.y, 'x': pos.x - editor.widthsX[spriter][1] };
                        else {
                            var y = pos.y;
                            if (this.folded) {
                                y += editor.uivalues.foldPerCol * (pos.x - editor.widthsX[spriter][1]);
                            }
                            if (pos.images == 'terrains' && pos.x == 0) y -= 2;
                            editor.info = { 'images': pos.images, 'y': y }
                        }
    
                        for (var ii = 0; ii < editor.ids.length; ii++) {
                            if ((core.tilesets.indexOf(pos.images) != -1 && editor.info.images == editor.ids[ii].images
                                && editor.info.y == editor.ids[ii].y && editor.info.x == editor.ids[ii].x)
                                || (Object.prototype.hasOwnProperty.call(autotiles, pos.images) && editor.info.images == editor.ids[ii].id
                                    && editor.info.y == editor.ids[ii].y)
                                || (core.tilesets.indexOf(pos.images) == -1 && editor.info.images == editor.ids[ii].images
                                    && editor.info.y == editor.ids[ii].y)
                            ) {
    
                                editor.info = editor.ids[ii];
                                break;
                            }
                        }
    
                        if (editor.info.isTile && e.button == 2) {
                            var v = prompt("请输入该额外素材区域绑定宽高，以逗号分隔", "1,1");
                            if (v != null && /^\d+,\d+$/.test(v)) {
                                v = v.split(",");
                                var x = parseInt(v[0]), y = parseInt(v[1]);
                                var widthX = editor.widthsX[editor.info.images];
                                if (x <= 0 || y <= 0 || editor.info.x + x > widthX[2] - widthX[1] || 32*(editor.info.y + y) > widthX[3]) {
                                    alert("不合法的输入范围，已经越界");
                                } else {
                                    editor.uivalues.tileSize = [x, y];
                                }
                            }
                        }
    
                    }
                    tip.infos(JSON.parse(JSON.stringify(editor.info)));
                    editor_mode.onmode('nextChange');
                    editor_mode.onmode('enemyitem');
                    editor.updateLastUsedMap();
                    //editor_mode.enemyitem();
                }
            }
        }
    }
}