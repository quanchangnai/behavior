module.exports = {
    filenameHashing: true,
    pluginOptions: {
        electronBuilder: {
            nodeIntegration: true,
            mainProcessFile: 'src/main/main.js',
            rendererProcessFile: 'src/render/render.js',
            mainProcessWatch: ['src/main/*.js'],
            builderOptions: {
                icon: "public/icon",
                win: {target: "dir"},
                mac: {target: "dir"},
                linux: {target: "dir"}
            }
        }
    }
};