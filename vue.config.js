module.exports = {
    filenameHashing: true,
    pluginOptions: {
        electronBuilder: {
            nodeIntegration: true,
            mainProcessFile: 'src/main.js',
            rendererProcessFile: 'src/render.js',
            builderOptions: {
                win: {target: "dir"}
            }
        }
    }
};