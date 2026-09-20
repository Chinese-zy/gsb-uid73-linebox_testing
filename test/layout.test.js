const assert = require("assert");
const { layoutText } = require("../js/layout.js");

const PAGE_SPEC = { glyph: 16, lineHeight: 16, boxWidth: 80 };
const failures = [];

function test(name, fn) {
  try {
    fn();
    console.log("ok - " + name);
  } catch (error) {
    failures.push({ name: name, error: error });
    console.error("FAIL - " + name);
  }
}

function glyphAt(line, index) {
  return line.glyphs[index];
}

test("写死字宽行高盒宽：短词单行不折断、不裁切", () => {
  const laid = layoutText("甲乙丙", PAGE_SPEC);
  assert.strictEqual(laid.lineHeight, 16);
  assert.strictEqual(laid.lines.length, 1);
  assert.strictEqual(laid.lines[0].text, "甲乙丙");
  assert.deepStrictEqual(laid.breaks, []);
  assert.strictEqual(laid.clipAt, null);
  assert.deepStrictEqual(
    laid.lines[0].glyphs.map((glyph) => glyph.x),
    [0, 16, 32]
  );
  assert.ok(laid.lines[0].glyphs.every((glyph) => glyph.y === 0));
});

test("从空格处断行：第二行字形落到下一条 16px 基线", () => {
  const source = "甲乙丙丁 戊";
  const laid = layoutText(source, PAGE_SPEC);
  assert.deepStrictEqual(laid.breaks, [5]);
  assert.strictEqual(source.charAt(laid.breaks[0]), laid.lines[1].text.charAt(0));
  assert.strictEqual(laid.clipAt, null);
  assert.strictEqual(laid.lines.length, 2);
  assert.strictEqual(laid.lines[0].text, "甲乙丙丁");
  assert.strictEqual(laid.lines[1].text, "戊");
  assert.deepStrictEqual(
    laid.lines[0].glyphs.map((glyph) => glyph.x),
    [0, 16, 32, 48]
  );
  assert.strictEqual(laid.lines[0].y, 0);
  assert.strictEqual(laid.lines[1].y, 16);
  assert.strictEqual(glyphAt(laid.lines[1], 0).y, 16);
  assert.strictEqual(glyphAt(laid.lines[1], 0).x, 0);
});

test("连续换行：每条基线按行高堆叠，空格也占一个字宽", () => {
  const source = "一 二 三 四 五 六";
  const laid = layoutText(source, { glyph: 16, lineHeight: 16, boxWidth: 48 });
  assert.deepStrictEqual(laid.breaks, [4, 8]);
  assert.deepStrictEqual(laid.breaks.map((index) => source.charAt(index)), ["三", "五"]);
  assert.deepStrictEqual(laid.lines.map((line) => line.text), ["一 二", "三 四", "五 六"]);
  assert.deepStrictEqual(laid.lines.map((line) => line.y), [0, 16, 32]);
  assert.deepStrictEqual(
    laid.lines[0].glyphs.map((glyph) => glyph.ch),
    ["一", " ", "二"]
  );
  assert.deepStrictEqual(
    laid.lines[0].glyphs.map((glyph) => glyph.x),
    [0, 16, 32]
  );
});

test("一个词比盒子还长：按盒宽整字宽切，clipAt 落在盒边像素", () => {
  const laid = layoutText("超宽词不应被拆开", PAGE_SPEC);
  assert.strictEqual(laid.clipAt, 80);
  assert.strictEqual(laid.lines.length, 1);
  assert.strictEqual(laid.lines[0].text, "超宽词不应");
  assert.strictEqual(laid.lines[0].glyphs.length, 5);
  assert.strictEqual(glyphAt(laid.lines[0], 4).x, 64);
});

test("盒宽不整除字宽：整字宽排布，裁切仍切在盒边像素", () => {
  const laid = layoutText("甲乙丙丁戊", { glyph: 16, lineHeight: 16, boxWidth: 70 });
  assert.strictEqual(laid.clipAt, 70);
  assert.strictEqual(laid.lines[0].text, "甲乙丙丁");
  assert.strictEqual(laid.lines[0].glyphs.length, 4);
  assert.strictEqual(glyphAt(laid.lines[0], 3).x, 48);
});

test("词宽恰好等于盒宽：塞满但不切", () => {
  const laid = layoutText("甲乙 丙丁戊己庚", PAGE_SPEC);
  assert.strictEqual(laid.clipAt, null);
  assert.deepStrictEqual(laid.breaks, [3]);
  assert.deepStrictEqual(laid.lines.map((line) => line.text), ["甲乙", "丙丁戊己庚"]);
  assert.strictEqual(glyphAt(laid.lines[1], 4).x, 64);
});

test("超长词前已有行：先在空格折断，再把超长词切在盒边", () => {
  const laid = layoutText("甲乙 丙丁戊己庚辛", PAGE_SPEC);
  assert.deepStrictEqual(laid.breaks, [3]);
  assert.strictEqual(laid.clipAt, 80);
  assert.deepStrictEqual(laid.lines.map((line) => line.text), ["甲乙", "丙丁戊己庚"]);
  assert.deepStrictEqual(laid.lines.map((line) => line.y), [0, 16]);
});

test("空串：零行、零断点、无裁切，行高仍写死返回", () => {
  assert.deepStrictEqual(layoutText("", PAGE_SPEC), {
    lines: [],
    breaks: [],
    clipAt: null,
    lineHeight: 16,
  });
  assert.deepStrictEqual(layoutText({ text: "" }, PAGE_SPEC).lines, []);
});

test("父级零高：照量子级行盒，行仍从零高基线排起、横向照样切", () => {
  const zeroParent = layoutText("甲乙丙丁戊己", {
    glyph: 16,
    lineHeight: 16,
    boxWidth: 80,
    parentHeight: 0,
  });
  const normal = layoutText("甲乙丙丁戊己", { glyph: 16, lineHeight: 16, boxWidth: 80 });
  assert.strictEqual(zeroParent.lines.length, 1);
  assert.strictEqual(zeroParent.lines[0].y, 0);
  assert.strictEqual(zeroParent.lineHeight, 16);
  assert.strictEqual(zeroParent.clipAt, 80);
  assert.deepStrictEqual(zeroParent, normal);
});

test("同一输入问两次：结果完全一致", () => {
  const first = layoutText("甲乙 丙丁戊己庚辛", PAGE_SPEC);
  const second = layoutText("甲乙 丙丁戊己庚辛", PAGE_SPEC);
  assert.deepStrictEqual(first, second);
});

test("量到一半盒宽字宽被改掉：本次结果按进入时的写死值走", () => {
  let glyphReads = 0;
  const mutatingGlyph = {
    get glyph() {
      glyphReads += 1;
      return glyphReads === 1 ? 16 : 999;
    },
    lineHeight: 16,
    boxWidth: 80,
  };
  let widthReads = 0;
  const mutatingWidth = {
    glyph: 16,
    lineHeight: 16,
    get boxWidth() {
      widthReads += 1;
      return widthReads === 1 ? 80 : 1;
    },
  };
  assert.deepStrictEqual(layoutText("甲乙丙丁 戊", mutatingGlyph), layoutText("甲乙丙丁 戊", PAGE_SPEC));
  assert.deepStrictEqual(layoutText("甲乙丙丁 戊", mutatingWidth), layoutText("甲乙丙丁 戊", PAGE_SPEC));
});

test("宽盒写死 160px：页面长句单行放下、不切", () => {
  const laid = layoutText("甲乙丙丁戊己", { glyph: 16, lineHeight: 16, boxWidth: 160 });
  assert.strictEqual(laid.clipAt, null);
  assert.deepStrictEqual(laid.breaks, []);
  assert.strictEqual(laid.lines.length, 1);
  assert.deepStrictEqual(
    laid.lines[0].glyphs.map((glyph) => glyph.x),
    [0, 16, 32, 48, 64, 80]
  );
});

if (failures.length > 0) {
  console.error("\n" + failures.length + " 条失败：");
  for (const failure of failures) {
    console.error("- " + failure.name + ": " + failure.error.message);
  }
  process.exit(1);
}
console.log("\n全部通过：" + "非截图布局断言");
