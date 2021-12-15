module.exports = {
    outputDir: "dist",
    filenameHashing: true,
    pluginOptions: {
        electronBuilder: {
            nodeIntegration: true,
            mainProcessFile: 'src/main.js',
            rendererProcessFile: 'src/render.js',
            builderOptions: {
                win: {target: "portable"}
            }
        }
    }
};