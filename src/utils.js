export default {
    /**
     *获取元素ClientX
     * @param el {Element|String} 元素或者选择器
     * @returns {number}
     */
    getClientX(el) {
        let element;
        if (typeof el === 'string') {
            element = document.querySelector(el);
        } else {
            element = el
        }
        if (element.offsetParent) {
            return this.getClientX(element.offsetParent) + element.offsetLeft;
        } else {
            return element.offsetLeft;
        }
    },
    /**
     * 获取元素ClientY 元素或者选择器
     * @param el {Element|String}
     * @returns {number}
     */
    getClientY(el) {
        let element;
        if (typeof el === 'string') {
            element = document.querySelector(el);
        } else {
            element = el
        }
        if (element.offsetParent) {
            return this.getClientY(element.offsetParent) + element.offsetTop;
        } else {
            return element.offsetTop;
        }
    },
}