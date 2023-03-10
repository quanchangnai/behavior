const fs = require("fs");
const path = require("path");
const {marked} = require("marked");

async function afterPack(cxt) {
    let md = (await fs.promises.readFile("README.md")).toString();
    return new Promise((resolve, reject) => {
        marked(md, function (err, html) {
            if (err) {
                reject(err);
            } else {
                fs.writeFile(path.resolve(cxt.appOutDir, "README.html"), html, resolve);
            }
        });
    })
}

// noinspection JSUnusedGlobalSymbols
module.exports = {
    filenameHashing: true,
    pluginOptions: {
        electronBuilder: {
            outputDir: 'dist',
            nodeIntegration: true,
            mainProcessFile: 'src/main/main.js',
            rendererProcessFile: 'src/render/render.js',
            mainProcessWatch: ['src/main/*.js'],
            builderOptions: {
                icon: "public/icon",
                win: {target: "zip"},
                mac: {target: "zip"},
                linux: {target: "tar.gz"},
                afterPack
            }
        }
    }
};