// Build the client-side face-mode table from the owner's 10-face-modes.json.
//
//   node tools/build-face-modes.mjs "D:\卫\卫戍协议\Stronghold-Protocol-v0.3.0\10-face-modes.json"
//
// Writes public/js/render/faceModes.js (a plain ES module, so the renderer needs no fetch): per operator, one row per
// ability animation — [animKey, mode, up, down, escapeTime] — where `mode` is the client's own facing mode for that
// animation (Target / none / Default / Front / FirstCastTarget / ForceToDirection / CheckDownAttack / …), `up` / `down`
// the direction-specific clip variants the skeleton may have, and `escapeTime` how long the facing is kept after the clip.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const [, , input] = process.argv;
if (!input) {
  console.error('usage: node tools/build-face-modes.mjs <10-face-modes.json>');
  process.exit(2);
}

const raw = JSON.parse(readFileSync(input, 'utf8'));
const ops = raw.operators || {};
const rows = Object.create(null);
let count = 0;
for (const [id, list] of Object.entries(ops)) {
  if (!Array.isArray(list) || !list.length) continue;
  const out = [];
  for (const e of list) {
    const animKey = typeof e.animKey === 'string' ? e.animKey : '';
    const mode = typeof e.mode === 'string' && e.mode ? e.mode : 'Target';
    const up = typeof e.up === 'string' ? e.up : '';
    const down = typeof e.down === 'string' ? e.down : '';
    const escape = Number(e.escapeTime) > 0 ? Math.round(Number(e.escapeTime) * 1000) / 1000 : 0;
    out.push([animKey, mode, up, down, escape]);
    count++;
  }
  rows[id] = out;
}

const header = `// Operator face modes (generated — do not edit): one row per ability animation of every operator, from the owner's
// 10-face-modes.json. Row = [animKey, mode, up, down, escapeTime]:
//   animKey     the animation the mode drives ('' = the ability's default, used when no clip matches)
//   mode        Target | none | Default | Front | Default+ForceToDirection | Target+ForceToDirection | FirstCastTarget |
//               Default+FirstCastTarget | FirstCastTarget+CheckDownAttack | Target+Default  (a '+' splits flags)
//   up / down   the direction-specific clip variants the skeleton has (Attack_Down, Skill_1_Loop_Down, …), '' if none
//   escapeTime  seconds the facing is kept after the clip ends before the model goes back to its deployed direction
// Rebuild with: node tools/build-face-modes.mjs <10-face-modes.json>
export const FACE_MODES = `;

const body = JSON.stringify(rows);
const text = `${header}{\n${body.slice(1, -1)},\n};\n\nexport default FACE_MODES;\n`;
const outDir = path.resolve('public/js/render');
mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, 'faceModes.js');
writeFileSync(outFile, text, 'utf8');
console.log(`✔ ${Object.keys(rows).length} operators, ${count} rows → ${outFile} (${Math.round(text.length / 1024)} KB)`);
