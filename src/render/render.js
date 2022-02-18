import Vue from 'vue'
import ElementUI from 'element-ui'
import 'element-ui/lib/theme-chalk/index.css'
import IndexPage from '../components/IndexPage'
import logger from "electron-log";
import utils from "./utils";

Vue.use(ElementUI);

Vue.config.productionTip = false;
Vue.prototype.$logger = logger;
Vue.prototype.$utils = utils;
Vue.prototype.$events = utils.events;
Vue.prototype.$msg = utils.msg;

new Vue({
    render: h => h(IndexPage),
}).$mount('#el');
