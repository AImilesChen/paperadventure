// One-time source asset preparation. Existing game assets are never overwritten.
import { mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { lighthouse, lighthouseStages, lighthouseLogs, lighthouseModules, lighthouseModuleSvg, lighthousePowerSvg, lighthouseLensBoardSvg, lighthouseLensMaskSvg } from '../shared/lighthouse-game.mjs';
const require = createRequire(import.meta.url);
const sharp = require(process.argv[2] || 'sharp');
const source = process.argv[3];
const output = path.resolve('public/assets/lighthouse'), temp = path.resolve('tmp/lighthouse-build');
await mkdir(output, { recursive: true }); await mkdir(temp, { recursive: true });
if (source) {
  const inputs = { coast: 'exec-83699c46-8f72-42ef-a592-c67d86e0bd8b.png', desk: 'exec-a18086d9-cbee-482a-80d5-ea0e6695f98d.png', power: 'exec-6c51c651-c5fd-41ce-90de-93dc0f73518b.png', lens: 'exec-9a165d81-93aa-41f6-8c2c-a1cfef60f7b2.png' };
  for (const [id, filename] of Object.entries(inputs)) {
    const image = sharp(path.join(source, filename)).resize({ width: 1440, withoutEnlargement: true });
    await image.clone().webp({ quality: 85 }).toFile(path.join(output, id + '.webp'));
    await image.clone().jpeg({ quality: 88 }).toFile(path.join(temp, id + '.jpg'));
  }
} else {
  for (const id of ['coast', 'desk', 'power', 'lens']) await sharp(path.join(output, id + '.webp')).jpeg({ quality: 88 }).toFile(path.join(temp, id + '.jpg'));
}
await writeFile(path.join(temp, 'game.json'), JSON.stringify({ lighthouse, stages: lighthouseStages, logs: lighthouseLogs, modules: lighthouseModules }, null, 2));
const drawings = { 'power-board': lighthousePowerSvg(), 'lens-board': lighthouseLensBoardSvg(), 'lens-mask': lighthouseLensMaskSvg(), ...Object.fromEntries(lighthouseModules.map(m => [`module-${m.symbol}-${m.value}`, lighthouseModuleSvg(m)])) };
for (const [name, svg] of Object.entries(drawings)) await sharp(Buffer.from(svg), { density: 288 }).png().toFile(path.join(temp, name + '.png'));
console.log('Prepared four story scenes and shared printable diagrams.');
