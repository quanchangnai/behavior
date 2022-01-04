const fs = require("fs");
const path = require("path");
const {marked} = require("marked");

async function afterPack(cxt) {
    let src = (await fs.promises.readFile("README.md")).toString();
    return new Promise((resolve, reject) => {
        marked(src, function (err, result) {
            if (err) {
                reject(err);
            } else {
                fs.writeFileSync(path.resolve(cxt.appOutDir, "README.html"), result);
                resolve();
            }
        });
    })
}

// noinspection JSUnusedGlobalSymbols
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
                win: {target: "zip"},
                mac: {target: "zip"},
                linux: {target: "tar.gz"},
                afterPack
            }
        }
    }
};