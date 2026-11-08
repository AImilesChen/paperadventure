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
