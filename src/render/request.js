import axios from "axios";

FormData.encode = function (data) {
    if (data instanceof FormData) {
        return data;
    }
    let formData = new FormData();
    for (let key of Object.keys(data)) {
        formData.append(key, data[key]);
    }
    return formData;
};

function _create(baseUrl) {
    let baseAxios = axios.create({baseURL: (baseUrl || process.env.BASE_URL)});
    return {
        create(baseUrl) {
            return _create(baseUrl);
        },
        async get(url) {
            return (await baseAxios.get(url)).data;
        },
        async post(url, data, body = false) {
            if (data && !body) {
                data = FormData.encode(data)
            }
            return (await baseAxios.post(url, data)).data;
        }
    }
}

export default _create();
