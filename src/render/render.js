import Vue from 'vue'
import ElementUI from 'element-ui'
import 'element-ui/lib/theme-chalk/index.css'
import IndexPage from '../components/IndexPage'
import utils from "./utils";

Vue.use(ElementUI);

Vue.config.productionTip = false;
Vue.prototype.$events = new Vue();
Vue.prototype.$utils = utils;
Vue.prototype.$store = {};

new Vue({
    render: h => h(IndexPage),
}).$mount('#el');
