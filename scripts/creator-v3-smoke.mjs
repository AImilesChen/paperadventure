import assert from 'node:assert/strict';
import { validatePurchase } from '../backend/domain.mjs';
import { generateSinglePlan } from '../backend/plan-proposals.mjs';
import { generateStory } from '../backend/openai.mjs';
import { buildGamePdf } from '../backend/pdf.mjs';

const key = process.env.DEEPSEEK_API_KEY;
if (!key) throw new Error('A private DeepSeek credential is required');
const env = { AI_PROVIDER: 'deepseek', DEEPSEEK_API_KEY: key, DEEPSEEK_MODEL: process.env.DEEPSEEK_MODEL || 'deepseek-flash' };
const { spec } = validatePurchase({
  sku: 'custom_home', creatorVersion: 3, customIdea: 'A stopped clock tower and a missing noon bell',
  players: 4, age: '8-10', paper: 'A4', place: 'Living room table',
  storyLocation: 'A fictional clock tower', gameplay: { primary: 'reasoning', secondary: ['discussion'] },
});
let planned;
for (let attempt = 1; attempt <= 3; attempt++) {
  try { planned = await generateSinglePlan(spec, env, fetch); break; }
  catch (error) {
    console.warn(`Plan attempt ${attempt}: ${error.code || error.name}; ${error.cause?.message || error.message}`);
    if (attempt === 3) throw error;
  }
}
assert.equal(planned.plan.stages.length, 5);
const approved = { ...spec, plan: planned.plan };
const generated = await generateStory(approved, env);
assert.equal(generated.story.stages.length, 5);
for (const role of ['player', 'guide']) {
  const pdf = buildGamePdf(generated.story, approved, role);
  assert.equal(new TextDecoder().decode(pdf.slice(0, 4)), '%PDF');
  assert.ok(pdf.length > 1000);
}
console.log(JSON.stringify({ verified: true, setting: spec.setting, planStages: planned.plan.stages.length,
  storyStages: generated.story.stages.length, planUsage: planned.usage, storyUsage: generated.usage }));
