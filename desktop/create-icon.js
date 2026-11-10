const fs = require("node:fs");
const path = require("node:path");
const pngToIco = require("png-to-ico").default;

const source = path.join(__dirname, "..", "ledgerly-app-icon-v2-512.png");
const target = path.join(__dirname, "icon.ico");
pngToIco(source).then((buffer) => fs.writeFileSync(target, buffer));
