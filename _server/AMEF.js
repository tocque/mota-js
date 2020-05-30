/**
 * Another Mota-js Editor Framework
 * 为编辑器设计的MVVM框架
 * @author tocque
 */

// @ts-check

(function() {

/**
 * 
 * @param {string} str 
 * @param {string} info 
 */
const parseError = function(str, info) {
    throw Error("不正确的模板字符串: \n" + str + info);
}

/**
 * @typedef {{
 *     tagName: string
 *     attrs: { [key: string]: string } 
 * }} ASTNode 指令
 * 
 * 从标签内容中解析出各个属性
 * @param {string} tpl 
 * @returns {ASTNode}
 */
const tagParser = function(tpl) {
    console.log(tpl);
    const tagName = tpl.split(/[ >]/, 1)[0].slice(1);
    // 若有闭标签则去掉, 得到完整的模板
    if (tpl.endsWith(tagName+'>')) {
        tpl = tpl.slice(tagName.length+1, -tagName.length-3);
    } else {
        tpl = tpl.slice(tagName.length+1);
    }
    const attrs = {};
    let state = 0, 
        attrStart = -1, attrName = "", 
        valueStart = -1, quotationMark = "";
    for (let i = 0; i < tpl.length; i++) {
        const ch = tpl[i];
        switch(state) {
            case 0: { // 未进入匹配
                if (/[a-zA-Z#$@&]/.test(ch)) { // 进入属性匹配
                    if (attrStart > 0) { // 若上一个属性未赋值, 则赋为空字符串
                        attrStart = -1;
                        attrs[attrName] = "";
                        attrName = "";
                    }
                    attrStart = i;
                    state = 1;
                } else if (ch === '=') { // 进入值匹配
                    if (attrStart == -1) {
                        parseError(tpl.substring(0, i+1), " <=== 在此处匹配到了没有对应属性的赋值符号");
                    }
                    state = 2;
                } else if (ch === '>') { // 遇到 > 返回
                    if (attrStart > 0) { // 若上一个属性未赋值, 则赋为空字符串
                        attrStart = -1;
                        attrs[attrName] = "";
                        attrName = "";
                    }
                    // @ts-ignore
                    return { tagName, attrs };
                }
            } break;
            case 1: { // 匹配属性名称
                if (/[\s>=]/.test(ch)) { // 遇到空字符或>或=时退出匹配
                    attrName = tpl.substring(attrStart, i);
                    state = 0;
                    if (ch === '>' || ch === '=') i--; // 重匹配
                }
            } break;
            case 2: { // 尝试匹配值
                if (/['"]/.test(ch)) { // 遇到引号时进入值匹配
                    quotationMark = ch;
                    valueStart = i+1;
                    state = 3;
                } else if (/[>=]/.test(ch)) {
                    parseError(tpl.substring(0, i+1), " <=== 在此处匹配到了没有对应值的赋值符号");
                }
            } break;
            case 3: { // 匹配值
                if (ch == quotationMark) { // 遇到成对引号时匹配终止
                    attrStart = -1;
                    attrs[attrName] = tpl.substring(valueStart, i);
                    attrName = "";
                    state = 0;
                }
            } break;
        }
    }
    parseError(tpl, "\n 没有正确终止");
}

/**
 * 文本节点匹配
 * @param {string} tpl 
 * @returns {[number, string][]}
 */
const textParser = function(tpl) {
    /** @type {[number, string][]} */const token = [];
    let state = 0, 
        textStart = 0,
        experssionStart = 0;
    for (let i = 0; i < tpl.length; i++) {
        const ch = tpl[i];
        switch(state) {
            case 0: { // 匹配文本节点
                if (ch === "{" && tpl[i+1] === "{") { // 匹配到mustache语法
                    token.push([0, tpl.substring(textStart, i)]);
                    experssionStart = i+2;
                    i++;
                    state = 1;
                }
            } break;
            case 1: {
                if (ch === "}" && tpl[i+1] === "}") { // 匹配到mustache语法
                    token.push([1, tpl.substring(experssionStart, i)]);
                    textStart = i+2;
                    i++;
                    state = 0;
                }
            }
        }
    }
    if (state === 1) {
        parseError(tpl, "\n mustache值块没有正确终止 ");
    }
    return token;
}

/**
 * 表达式解析, 分析表达式中引用的组件变量, 并添加this指向
 * @param {string} tpl
 * @returns {{ ref: {[key: string]: string}, experssion: string }}
 */
const expressionParser = function(tpl) {
    const ref = {};
    tpl = tpl.replace(/@([a-z]+)/g, (all, name) => {
        ref[name] = true;
        return "this." + name;
    })
    // @ts-ignore
    return { ref, experssion: tpl };
}

/**
 * AMEF组件的基类, 绝大多数框架功能在此处实现
 * 内置函数和变量以$开头
 * 内部实现用的各方法和变量以_开头
 */
// @ts-ignore
window.AMEFComponent = class AMEFComponent {

    /** @type {{[key: string]: any}} */$data = {}
    /** @type {HTMLElement} */$root
    /** @type {AMEFComponent} */$parent
    /** @type {AMEFComponent[]} */$children = []
    /** @type {string} */$template = ""

    /** @type {{[key: string]: Array<(value: any, oldValue: any) => void>}} */_watcher = {}

    constructor() {
        this.$setup();
        console.log(this.$data);
        Object.keys(this.$data).forEach((key) => {
            this.$observe(key, true);
        })
    }

    /**
     * 生命周期钩子, 在组件实例化后运行
     */
    $setup() {

    }

    /**
     * 遍历深层数据对象
     * @param {string} key 监听对象名称
     * @param {any} obj 对象
     * @param {any} target
     * @private
     */
    _deepBind(key, obj, target) {

        if (typeof obj === 'object') { // 对对象进行深层遍历
            for (var k in obj) {
                this._deepBind(key, obj[k], obj);
            }
        } else {
            Object.defineProperty(target, key, {
                enumerable: true, // 是否可枚举
                configurable: true, // 是否可删除
                get: () => {
                    console.log('get', key, obj)
                    return obj;
                },
                set: (newVal) => {
                    console.log('set', key, newVal);
                    if (obj !== newVal) {
                        obj = newVal;
                        if (typeof newVal == 'object') this._deepBind(key, newVal, target);
                        this._watcher[key].forEach((e) => e(newVal, obj));
                    }
                }
            })
        }
    }

    /**
     * 监听一个属性
     * @param {string} key
     * @param {boolean?} init
     */
    $observe(key, init) {
        if (!init && this.$data[key]) return;
        if (this[key]) this.$data[key] = this[key];
        this._watcher[key] = [];
        this._deepBind(key, this.$data[key], this);
    }

    /**
     * 设置一个监听器
     * @param {string} propName 要监听的属性名
     * @param {(val?: any, oldVal?: any) => void} action 响应函数
     */
    $watch(propName, action) {
        this._watcher[propName].push(action);
    }

    $on() {

    }

    /**
     * 递归解析模板并设置绑定器
     * @param {ChildNode} elm
     * @param {Element} [parent] 
     */
    _attachEmitter(elm, parent) {
        if (elm instanceof Element) {
            // @ts-ignore
            const tagHTML = elm.cloneNode().outerHTML;
            const tagContent = tagParser(tagHTML);
            console.log(tagContent);
            Object.entries(tagContent.attrs).forEach(([attr, val]) => {
                switch (attr[0]) {
                    case ':': {
                        const propName = attr.slice(1);
                        const { ref, experssion } = expressionParser(val);
                        const calAttr = new Function(experssion).bind(this);
                        const updateAttr = function() {
                            elm.setAttribute(propName, calAttr());
                        }
                        Object.keys(ref).forEach((key) => {
                            this.$watch(key, updateAttr);
                        })
                        updateAttr();
                    } break;
                    case '&': {
                        if (!(elm instanceof HTMLInputElement)) {
                            console.error("双向绑定指令只支持 <input/>" + "\nsource: " + tagHTML);
                            return;
                        }
                        const propName = attr.slice(1);
                        if (!this[propName]) {
                            console.error("找不到双向绑定的目标属性 [" + propName + "] \nsource: " + tagHTML);
                            return;
                        }
                        this.$watch(propName, (val) => {
                            elm.value = val;
                        })
                        elm.value = this[propName];
                        let needParse = (typeof this[propName] === "number")
                        elm.addEventListener("input", (e) => {
                            // @ts-ignore
                            this[propName] = needParse ? parseInt(e.target.value) : e.target.value;
                        })
                    } break;
                    case '@': {
                        const { experssion } = expressionParser(val);
                        const func = new Function(experssion).bind(this);
                        elm.addEventListener(attr.slice(1), (e) => {
                            func(e);
                        })
                    } break;
                    default: return; // 普通属性略过后续处理
                }
                elm.removeAttribute(attr);
            })
            for (let e of elm.childNodes) { 
                this._attachEmitter(e, elm);
            }
        } else {
            console.log(elm.textContent);
            const textContent = textParser(elm.textContent);
            console.log(textContent);
            if (textContent.length === 1 && textContent[0][0] === 0) return;
            const refs = {};
            for (let token of textContent) {
                if (token[0] == 1) {
                    const { ref, experssion } = expressionParser(token[1]);
                    token[1] = experssion;
                    Object.assign(refs, ref);
                }
            }
            const updateText = function() {
                elm.textContent = textContent.map(([type, content]) => {
                    if (type == 0) return content;
                    else return eval(content);
                }).join("");
            }.bind(this);
            Object.keys(refs).forEach((key) => {
                this.$watch(key, updateText);
            })
            updateText();
        }
    }

    /**
     * 将模板渲染成DOM
     * @param {string} tpl 
     * @returns {HTMLElement}
     */
    $render(tpl) {
        const fac = document.createElement("div");
        fac.innerHTML = tpl;
        console.log(fac.firstElementChild);
        // @ts-ignore
        this._attachEmitter(fac.firstElementChild);
        // @ts-ignore
        return fac.firstElementChild;
    }

    /**
     * 将组件挂载到父组件或dom元素上
     * @param {string|Element} to 要挂载到的DOM对象
     * @param {AMEFComponent} parent
     */
    $mount(to, parent) {
        if (typeof to ===  "string") {
            to = document.querySelector(to);
            if (!to) {
                throw Error("mount to enmty");
            }
        }
        if (parent) {
            parent.$children.push(this);
            this.$parent = parent;
        }
        this.$root = this.$render(this.$template);
        to.appendChild(this.$root);
    }
}

})();