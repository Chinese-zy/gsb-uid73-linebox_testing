function layoutText(input, spec) {
  const text = typeof input === "string" ? input : String(input.text);
  const glyph = spec.glyph;
  const lineHeight = spec.lineHeight;
  const boxWidth = spec.boxWidth;
  const words = text.split(" ");
  const lines = [];
  let line = "";
  let breaks = [];
  let clipAt = null;
  let cursor = 0;

  function pushLine() {
    if (!line) return;
    const y = lines.length * lineHeight;
    const glyphs = [];
    for (let i = 0; i < line.length; i++) {
      glyphs.push({ ch: line[i], x: i * glyph, y: y });
    }
    lines.push({ text: line, y: y, glyphs: glyphs });
    line = "";
  }

  for (let w = 0; w < words.length; w++) {
    const word = words[w];
    const wordWidth = word.length * glyph;
    if (word === "" && text === "") break;
    if (wordWidth > boxWidth) {
      if (line) {
        breaks.push(cursor);
        pushLine();
      }
      const fit = Math.floor(boxWidth / glyph);
      line = word.slice(0, fit);
      clipAt = boxWidth;
      pushLine();
      cursor += word.length + 1;
      continue;
    }
    const gap = line ? 1 : 0;
    const next = line ? line + " " + word : word;
    if (next.length * glyph > boxWidth && line) {
      breaks.push(cursor);
      pushLine();
      line = word;
    } else {
      line = next;
    }
    cursor += word.length + (w === words.length - 1 ? 0 : 1);
  }
  pushLine();
  if (text === "") {
    return { lines: [], breaks: [], clipAt: null, lineHeight: lineHeight };
  }
  return { lines: lines, breaks: breaks, clipAt: clipAt, lineHeight: lineHeight };
}

if (typeof module !== "undefined") module.exports = { layoutText };
