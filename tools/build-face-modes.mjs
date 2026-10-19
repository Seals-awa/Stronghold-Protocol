// Build the client-side face-mode table from the owner's 10-face-modes.json.
//
//   node tools/build-face-modes.mjs "path/to/10-face-modes.json"
//
// Writes public/js/render/faceModes.js — a plain ES module (no fetch at runtime), ONE OPERATOR PER LINE so the file stays
// reviewable and a change to one operator touches exactly one line:
//
//   "char_496_wildmn": [["Attack","Target","","Attack_Down",0],["Skill_2","Default","","Skill_2_Down",0]],
//
// Row = [animKey, mode, up, down, escapeTime]:
//   animKey     the animation the mode drives ('' = the ability's default, used when no clip matches)
//   mode        Target | none | Default | Front | …+ForceToDirection | FirstCastTarget | …+CheckDownAttack | … (a '+'
//               separates flags)
//   up / down   the direction-specific clip variants the skeleton may have (Attack_Down, Skill_1_Loop_Down, …), '' if none
//   escapeTime  seconds the facing is kept after the clip ends before the model goes back to its deployed direction
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const [, , input] = process.argv;
if (!input) {
  console.error('usage: node tools/build-face-modes.mjs <10-face-modes.json>');
  process.exit(2);
}

const raw = JSON.parse(readFileSync(input, 'utf8'));
const ops = raw.operators || {};
const lines = [];
let rowCount = 0;
for (const id of Object.keys(ops).sort()) {
  const list = ops[id];
  if (!Array.isArray(list) || !list.length) continue;
  const rows = [];
  for (const e of list) {
    const animKey = typeof e.animKey === 'string' ? e.animKey : '';
    const mode = typeof e.mode === 'string' && e.mode ? e.mode : 'Target';
    const up = typeof e.up === 'string' ? e.up : '';
    const down = typeof e.down === 'string' ? e.down : '';
    const escape = Number(e.escapeTime) > 0 ? Math.round(Number(e.escapeTime) * 1000) / 1000 : 0;
    rows.push(`[${JSON.stringify(animKey)},${JSON.stringify(mode)},${JSON.stringify(up)},${JSON.stringify(down)},${escape}]`);
    rowCount++;
  }
  lines.push(`  ${JSON.stringify(id)}: [${rows.join(',')}],`);
}

const header = `// Operator face modes — GENERATED, do not edit. Source: the owner's 10-face-modes.json (one row per ability animation
// of every operator). Rebuild with:
//   node tools/build-face-modes.mjs <path/to/10-face-modes.json>
//
// One operator per line: "charId": [[animKey, mode, up, down, escapeTime], ...]
//   animKey     the animation the mode drives ('' = the ability's default, used when no clip matches)
//   mode        Target (turn toward the target) | none (never turn) | Default (keep the deployed direction) |
//               Front (never the Back model) | ...+ForceToDirection / ...+CheckDownAttack (play the up/down clip instead) |
//               FirstCastTarget (keep the first cast's target) -- a '+' separates flags
//   up / down   the direction-specific clip variants the skeleton has, '' if none
//   escapeTime  seconds the facing is kept after the clip ends
export const FACE_MODES = {
`;

const text = `${header}${lines.join('\n')}\n};\n\nexport default FACE_MODES;\n`;
const outDir = path.resolve('public/js/render');
mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, 'faceModes.js');
writeFileSync(outFile, text, 'utf8');
console.log(`OK ${lines.length} operators, ${rowCount} rows -> ${outFile} (${Math.round(text.length / 1024)} KB, ${lines.length + 13} lines)`);
