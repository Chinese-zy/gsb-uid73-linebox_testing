"use strict";

// 不比图的核对：字宽、行高、盒宽写死，直接对数，可重跑。
// 整页比对那条在 test/shot.test.js，窗口或字体一变就红，别拿它当布局坏了。

const assert = require("node:assert/strict");
const { layoutText } = require("../js/layout.js");

const SPEC = { glyph: 8, lineHeight: 10, boxWidth: 32 };

const cases = [];
function test(name, fn) {
  cases.push({ name, fn });
}

test("断行：放不下的词换行，breaks 记原文下标", () => {
  const laid = layoutText("ab cde f", SPEC);
  assert.deepStrictEqual(laid.lines.map((l) => l.text), ["ab", "cde", "f"], "行内容");
  assert.deepStrictEqual(laid.breaks, [3, 7], "断点下标");
  assert.deepStrictEqual(laid.lines.map((l) => l.y), [0, 10, 20], "每行 y");
  assert.strictEqual(laid.clipAt, null, "没超宽就不记切点");
  assert.strictEqual(laid.lineHeight, 10, "行高透传");
});

test("字坐哪条线：每个字的 x/y 对得上", () => {
  const laid = layoutText("ab cde f", SPEC);
  assert.deepStrictEqual(
    laid.lines[1].glyphs,
    [
      { ch: "c", x: 0, y: 10 },
      { ch: "d", x: 8, y: 10 },
      { ch: "e", x: 16, y: 10 },
    ],
    "第二行字坐标"
  );
  assert.deepStrictEqual(laid.lines[2].glyphs, [{ ch: "f", x: 0, y: 20 }], "第三行字坐标");
});

test("超宽词：切在盒子宽那个像素", () => {
  const laid = layoutText("hi abcdefgh j", SPEC);
  assert.deepStrictEqual(laid.lines.map((l) => l.text), ["hi", "abcd", "j"], "行内容");
  assert.deepStrictEqual(laid.breaks, [3], "长词前先断行");
  assert.strictEqual(laid.clipAt, 32, "切点 = 盒宽");
  const exact = layoutText("abcd", SPEC);
  assert.strictEqual(exact.clipAt, null, "正好装满不算超宽");
  assert.deepStrictEqual(exact.lines.map((l) => l.text), ["abcd"], "正好装满不拆");
});

test("切点不对齐字宽：切在盒宽，不按字取整", () => {
  const laid = layoutText("abcde", { glyph: 8, lineHeight: 10, boxWidth: 30 });
  assert.deepStrictEqual(laid.lines.map((l) => l.text), ["abc"], "只留装得下的 3 个字");
  assert.strictEqual(laid.clipAt, 30, "切在 30，不是 24 也不是 32");
});

test("父级零高：parentHeight 0 也照常排", () => {
  const laid = layoutText("ab cde f", Object.assign({}, SPEC, { parentHeight: 0 }));
  assert.deepStrictEqual(laid, layoutText("ab cde f", SPEC), "和不传 parentHeight 一样");
  assert.strictEqual(laid.lines.length, 3, "零高不裁行");
});

test("量子级：盒子只装得下一个字", () => {
  const laid = layoutText("ab cd", { glyph: 8, lineHeight: 10, boxWidth: 8 });
  assert.deepStrictEqual(laid.lines.map((l) => l.text), ["a", "c"], "每个词切成一个字");
  assert.strictEqual(laid.clipAt, 8, "切点 = 盒宽");
});

test("量子级：盒子装不下一个字", () => {
  const laid = layoutText("ab", { glyph: 8, lineHeight: 10, boxWidth: 4 });
  assert.deepStrictEqual(laid.lines, [], "一个字都放不下就没有行");
  assert.strictEqual(laid.clipAt, 4, "切点照样记");
});

test("空串", () => {
  assert.deepStrictEqual(layoutText("", SPEC), {
    lines: [],
    breaks: [],
    clipAt: null,
    lineHeight: 10,
  });
});

test("量到一半数据被改掉：spec 只读一次", () => {
  let widthReads = 0;
  const rigged = {
    glyph: 8,
    lineHeight: 10,
    get boxWidth() {
      widthReads++;
      return widthReads === 1 ? 32 : 160;
    },
  };
  const laid = layoutText("ab cde f", rigged);
  assert.deepStrictEqual(laid, layoutText("ab cde f", SPEC), "中途改盒宽不影响结果");
  assert.strictEqual(widthReads, 1, "盒宽只读一次");
});

test("量到一半数据被改掉：输入文本只读一次", () => {
  let textReads = 0;
  const input = {
    get text() {
      textReads++;
      return textReads === 1 ? "ab cde f" : "zzzzzzzz";
    },
  };
  const laid = layoutText(input, SPEC);
  assert.deepStrictEqual(laid, layoutText("ab cde f", SPEC), "中途改文本不影响结果");
  assert.strictEqual(textReads, 1, "文本只读一次");
});

test("同一轮问两次：结果一致，spec 不被改", () => {
  const frozen = Object.freeze({ glyph: 8, lineHeight: 10, boxWidth: 32 });
  const first = layoutText("ab cde f", frozen);
  const second = layoutText("ab cde f", frozen);
  assert.deepStrictEqual(second, first, "两次结果一致");
  assert.deepStrictEqual(frozen, { glyph: 8, lineHeight: 10, boxWidth: 32 }, "spec 没被改");
});

let failed = 0;
for (const { name, fn } of cases) {
  try {
    fn();
    console.log("ok - " + name);
  } catch (err) {
    failed++;
    console.error("not ok - " + name);
    console.error(err && err.message ? err.message : err);
  }
}

if (failed > 0) {
  console.error(failed + "/" + cases.length + " 条没过");
  process.exit(1);
}
console.log(cases.length + " 条全过");
