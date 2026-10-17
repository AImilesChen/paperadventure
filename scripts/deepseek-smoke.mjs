import assert from 'node:assert/strict';
import { generateProposals, generateStory } from '../backend/openai.mjs';
import { validatePurchase } from '../backend/domain.mjs';
import { buildGamePdf } from '../backend/pdf.mjs';

const key = process.env.DEEPSEEK_API_KEY;
const model = process.env.DEEPSEEK_MODEL || 'deepseek-flash';
if (!key) throw new Error('DEEPSEEK_API_KEY is required in the CI secret store');
const env = { AI_PROVIDER: 'deepseek', DEEPSEEK_API_KEY: key, DEEPSEEK_MODEL: model };
const scenarios = [
  { sku: 'custom_home', themeId: 'celebration', players: 4, age: '8-10', paper: 'A4', direction: 'mystery', place: 'living room', reading: 'independent', materials: 'paper and pencils' },
  { sku: 'custom_classroom', themeId: 'dinosaur', players: 20, groups: 4, age: '8-10', paper: 'Letter', direction: 'mission', place: 'classroom desks', reading: 'mixed', materials: 'paper and pencils' },
];
const report = { model, scenarios: [] };
for (const input of scenarios) {
  const { spec } = validatePurchase(input);
  const proposals = await generateProposals(spec, env);
  assert.equal(proposals.proposals.length, 2);
  const result = await generateStory(spec, env);
  const player = buildGamePdf(result.story, spec, 'player');
  const guide = buildGamePdf(result.story, spec, 'guide');
  assert.equal(new TextDecoder().decode(player.slice(0, 4)), '%PDF');
  assert.equal(new TextDecoder().decode(guide.slice(0, 4)), '%PDF');
  report.scenarios.push({ setting: spec.setting, paper: spec.paper, stages: result.story.stages.length,
    proposalUsage: proposals.usage, generationAndAuditUsage: result.usage,
    playerBytes: player.length, guideBytes: guide.length });
}
console.log(JSON.stringify(report, null, 2));
