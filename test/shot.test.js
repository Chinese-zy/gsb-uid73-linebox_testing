const fs = require("fs");
const path = require("path");
const { PNG } = require("pngjs");
const pixelmatch = require("pixelmatch");

const goldenPath = path.join(__dirname, "page-golden.png");
const font = (process.env.FONT || "16px Songti SC") + ":" + (process.stdout.columns || 80);

function draw(label) {
  const png = new PNG({ width: 8, height: 8 });
  const ink = label.length * 17;
  for (let i = 0; i < png.data.length; i += 4) {
    png.data[i] = ink & 255;
    png.data[i + 1] = 40;
    png.data[i + 2] = 30;
    png.data[i + 3] = 255;
  }
  return png;
}

const golden = PNG.sync.read(fs.readFileSync(goldenPath));
const live = draw(font);
const diff = new PNG({ width: 8, height: 8 });
const mismatched = pixelmatch(golden.data, live.data, diff.data, 8, 8, { threshold: 0.1 });
if (mismatched > 0) {
  console.error("整页比对失败", mismatched);
  process.exit(1);
}
console.log("整页比对通过");
