import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { buildGamePdf } from '../backend/pdf.mjs';

const stages = Array.from({ length: 5 }, (_, index) => ({ number: index + 1, title: `A shared clue ${index + 1}`, clue: 'Choose the matching card and tell your group what you noticed.',
  options: ['A sunny marker', 'A cloudy marker', 'A starry marker'], answerIndex: 0, explanation: 'The sun symbol matches the route.', hint: 'Look at the first corner.', prerequisite: index ? `CODE-${index}` : 'START', unlock: `CODE-${index + 1}` }));
const story = { title: 'The Garden Trail', introduction: 'A friendly guide has left a trail of paper clues for the team.', ending: 'Everyone finds the final message together.', groupInstructions: 'Each group has its own clues and can work independently.', stages };
const temp = mkdtempSync(join(tmpdir(), 'paper-adventure-pdf-'));
try {
  for (const paper of ['A4','Letter']) for (const role of ['player','guide']) {
    const path = join(temp, `${paper}-${role}.pdf`);
    writeFileSync(path, buildGamePdf(story, { setting: 'classroom', paper }, role));
    const result = spawnSync('pdfinfo', [path], { encoding: 'utf8' });
    if (result.status !== 0 || !/Pages:\s+\d+/.test(result.stdout)) throw new Error(`PDF parser rejected ${paper} ${role}: ${result.stderr}`);
    console.log(`${paper} ${role}: ${result.stdout.match(/Pages:\s+\d+/)[0]}`);
  }
} finally { rmSync(temp, { recursive: true, force: true }); }
