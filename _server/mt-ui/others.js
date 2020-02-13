/**
 * 图标
 */
export const MtIcon = {
    name: "mt-icon",
    functional: true,
    render(h, ctx) {
        const size = ctx.props.size;
        let style = size ? {
            maxWidth: size + 'px',
            maxHeight: size + 'px',
            fontSize: size + 'px'
        } : {};
        let c = ctx.data.class instanceof Array ? ctx.data.class : [ctx.data.class];
        return h('i', {
            staticClass: ctx.data.staticClass,
            class: ['mt-icon', 'codicon', 'codicon-'+ctx.props.icon, ...c],
            attrs: ctx.attrs,
            style,
        })
    },
    props: ["icon", "svg", "size"]
}