import Vue from 'vue'
import ElementUI from 'element-ui'
import 'element-ui/lib/theme-chalk/index.css'
import IndexPage from '../components/IndexPage'
import utils from "./utils";
import logger from "electron-log";

Vue.use(ElementUI);

Vue.config.productionTip = false;
Vue.prototype.$events = new Vue();
Vue.prototype.$utils = utils;
Vue.prototype.$logger = logger;
Vue.prototype.$store = {};

new Vue({
    render: h => h(IndexPage),
}).$mount('#el');
