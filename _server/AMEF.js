/**
 * Another Mota-js Editor Framework
 * 为编辑器设计的MVVM框架
 * @author tocque
 */

// @ts-check

/**
 * AMEF组件的基类， 绝大多数框架功能在此处实现
 */
class AMEFComponent {

    /** @type {HTMLElement} */$root
    /** @type {AMEFComponent} */$parent
    /** @type {AMEFComponent[]} */$children
    /** @type {string} */$template

    /**
     * 将元素和变量进行双向数据绑定
     * @param {*} ref 
     * @param {string} key 
     */
    $bind(ref, key) {
        if (Array.isArray(ref)) {
            for (let [r, k] of ref) {
                this.$bind(r, k);
            }
        } else {
            //this.$root.getElement
        }
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
            /** @type {string} */let tagContent = elm.cloneNode().outerHTML;
            tagContent = tagContent.slice(1, -1);
            const tagName = tagContent.split(/[ >]/, 1)[0];
            // 若有闭标签则去掉, 得到完整的模板
            if (tagContent.endsWith(tagName)) {
                tagContent = tagContent.slice(0, -tagName.length-3);
            }
            tagContent.replace("")
            for (let e of elm.childNodes) {
                this._attachEmitter(e, elm);
            }
        } else {
            console.log(elm);
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