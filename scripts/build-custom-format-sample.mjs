import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { buildGamePdf } from '../backend/pdf.mjs';
import { validateGeneratedStory } from '../backend/domain.mjs';
import { sampleSpec, sampleStory } from '../content/custom-paper-format-sample.mjs';

const root=fileURLToPath(new URL('../public/assets/',import.meta.url));
const story=validateGeneratedStory(sampleStory,sampleSpec);
for(const role of ['player','guide']){
  const path=`${root}custom-paper-format-${role}-A4.pdf`;
  writeFileSync(path,buildGamePdf(story,sampleSpec,role));
  process.stdout.write(`${path}\n`);
}
