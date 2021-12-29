module.exports = {
    filenameHashing: true,
    pluginOptions: {
        electronBuilder: {
            nodeIntegration: true,
            mainProcessFile: 'src/main.js',
            rendererProcessFile: 'src/render.js',
            builderOptions: {
                icon: "public/icon",
                win: {target: "dir"},
                mac: {target: "dir"},
                linux: {target: "dir"}
            }
        }
    }
};