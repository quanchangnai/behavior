import Vue from 'vue'
import ElementUI from 'element-ui'
import 'element-ui/lib/theme-chalk/index.css'
import Index from './Index.vue'
import utils from "./utils";

Vue.use(ElementUI);

Vue.config.productionTip = false;
// noinspection JSUnusedGlobalSymbols
Vue.prototype.$events = new Vue();
// noinspection JSUnusedGlobalSymbols
Vue.prototype.$utils = utils;

new Vue({
    render: h => h(Index),
}).$mount('#el');
