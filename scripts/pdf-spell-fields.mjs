// Works out which form fields on the character sheet's spell page (page 3)
// belong to which spell level, from their positions, and writes
// src/utils/pdfSpellFields.json. Run with: node scripts/pdf-spell-fields.mjs
import { readFile, writeFile } from "node:fs/promises";
import { PDFCheckBox, PDFDocument } from "pdf-lib";

const PDF = new URL(
  "../public/TWC-DnD-5E-Character-Sheet-v1.6.pdf",
  import.meta.url
);
const OUT = new URL("../src/utils/pdfSpellFields.json", import.meta.url);

const doc = await PDFDocument.load(await readFile(PDF));
const spellPage = doc.getPages()[2].ref;

const widgets = doc
  .getForm()
  .getFields()
  .flatMap((field) =>
    field.acroField
      .getWidgets()
      .filter((w) => w.P() === spellPage)
      .map((w) => ({
        name: field.getName(),
        checkbox: field instanceof PDFCheckBox,
        ...w.getRectangle(),
      }))
  );

// Spell lines: three columns, each split into blocks by spell level
const lines = widgets.filter((w) => w.name.startsWith("Spells "));
const columns = [...new Set(lines.map((l) => Math.round(l.x / 50)))].sort(
  (a, b) => a - b
);
const blocks = columns.flatMap((column) => {
  const inColumn = lines
    .filter((l) => Math.round(l.x / 50) === column)
    .sort((a, b) => b.y - a.y);
  const groups = [[inColumn[0]]];
  for (const line of inColumn.slice(1)) {
    const previous = groups.at(-1).at(-1);
    if (previous.y - line.y > 20) groups.push([line]);
    else groups.at(-1).push(line);
  }
  return groups;
});
if (blocks.length !== 10) {
  throw new Error(`Expected 10 spell-level blocks, found ${blocks.length}`);
}

// Each line (except cantrips) has a "prepared" checkbox just to its left
const checkboxes = widgets.filter((w) => w.checkbox);
const preparedBoxFor = (line) =>
  checkboxes.find(
    (box) =>
      Math.abs(box.y + box.height / 2 - (line.y + line.height / 2)) < 5 &&
      box.x < line.x &&
      line.x - box.x < 25
  )?.name ?? null;

// The "slots total" box sits above each levelled block
const slotTotals = widgets.filter((w) => w.name.startsWith("SlotsTotal "));
const slotsFor = (block) =>
  slotTotals
    .filter(
      (s) =>
        Math.abs(Math.round(s.x / 50) - Math.round(block[0].x / 50)) <= 1 &&
        s.y > block[0].y &&
        s.y - block[0].y < 60
    )
    .sort((a, b) => a.y - b.y)[0]?.name ?? null;

const levels = blocks.map((block, level) => ({
  level,
  slotsTotal: level === 0 ? null : slotsFor(block),
  lines: block.map((line) => ({
    name: line.name,
    prepared: level === 0 ? null : preparedBoxFor(line),
  })),
}));

await writeFile(OUT, JSON.stringify(levels, null, 2) + "\n");
for (const l of levels) {
  console.log(
    `level ${l.level}: ${l.lines.length} lines, slots=${l.slotsTotal}, ` +
      `prepared boxes=${l.lines.filter((x) => x.prepared).length}`
  );
}
