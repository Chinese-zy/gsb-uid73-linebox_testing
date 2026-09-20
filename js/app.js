const spec = { glyph: 16, lineHeight: 16, boxWidth: 80 };

function show(id, text, width) {
  const box = document.getElementById(id);
  const laid = layoutText(text, Object.assign({}, spec, { boxWidth: width }));
  box.textContent = laid.lines.map((line) => line.text).join("\n");
}

show("short", "甲乙丙", 80);
show("long", "甲乙丙丁戊己", 160);
show("clip", "超宽词不应被拆开", 80);

const sample = layoutText("甲乙丙丁戊己", { glyph: 16, lineHeight: 16, boxWidth: 80, parentHeight: 0 });
document.getElementById("readout").textContent = JSON.stringify(sample);
