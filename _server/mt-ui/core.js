import './control.js';

import * as navi from'./navigation.js';
for (let c in navi) {
    Vue.component(navi[c].name, navi[c]);
}

import * as others from'./others.js';
for (let c in others) {
    Vue.component(others[c].name, others[c]);
}

import './contextmenu.js';
import './notify.js';
import './tree.js';