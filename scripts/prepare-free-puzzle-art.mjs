// Usage: node scripts/prepare-free-puzzle-art.mjs /path/to/node_modules/sharp
// Uses the same diagrams as the web page, rasterised at 4x for crisp PDF printing.
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { freePuzzles, puzzleSvg, postalRouteSvg } from '../shared/free-puzzles.mjs';
const require = createRequire(import.meta.url);
const sharp = require(process.argv[2] || 'sharp');
const out = path.resolve('tmp/free-puzzles-build');
await mkdir(out, { recursive: true });
await writeFile(path.join(out, 'puzzles.json'), JSON.stringify(freePuzzles, null, 2));
for (const puzzle of freePuzzles) {
  await sharp(Buffer.from(puzzleSvg(puzzle.id)), { density: 288 }).png().toFile(path.join(out, puzzle.id + '.png'));
}
console.log('Prepared six shared puzzle diagrams and content.');

await sharp(Buffer.from(postalRouteSvg()), { density: 288 }).png().toFile(path.join(out, 'postal-route.png'));

const {forestSvg,answerRoute,explanation,forestRules,evidence,terrain}=await import('../shared/forest-rescue.mjs');
await writeFile(path.join(out,'forest-rescue.json'),JSON.stringify({answerRoute,explanation,forestRules,evidence,terrain}));
await sharp(Buffer.from(forestSvg(answerRoute)),{density:288}).png().toFile(path.join(out,'forest-answer.png'));

const {evidenceSvg}=await import('../shared/forest-evidence-art.mjs');
for(const e of evidence)await sharp(Buffer.from(evidenceSvg(e.art)),{density:288}).png().toFile(path.join(out,`forest-evidence-${e.id}.png`));

const {lightDesign,lightSvg,lightRules,cellName,freshLights,toggleCircuit}=await import('../shared/harbour-lights.mjs');
await writeFile(path.join(out,'harbour-lights.json'),JSON.stringify({board:lightDesign.board,solution:lightDesign.solution,proof:lightDesign.proof.map(s=>({...s,names:s.indices.map(cellName)})),rules:lightRules}));
let lighting=freshLights();
for(let stage=0;stage<4;stage++){
 const batch=lightDesign.proof.slice(Math.floor(stage*lightDesign.proof.length/4),Math.floor((stage+1)*lightDesign.proof.length/4));
 for(const step of batch)for(const i of step.indices)lighting=toggleCircuit(lighting,i);
 await sharp(Buffer.from(lightSvg(lighting,batch.flatMap(s=>s.indices))),{density:288}).png().toFile(path.join(out,`harbour-stage-${stage+1}.png`));
}
