import test from 'node:test';
import assert from 'node:assert/strict';
import { aiProvider, generateProposals, generateStory } from './openai.mjs';
import { validatePurchase } from './domain.mjs';

const input = { sku: 'custom_home', customIdea: 'A garden map', players: 4, age: '8-10', paper: 'A4', direction: 'mission' };
const { spec } = validatePurchase(input);
const story = {
  title: 'Garden Compass', introduction: 'A team adventure begins.', ending: 'The team celebrates.',
  groupInstructions: '',
  stages: Array.from({ length: 5 }, (_, index) => ({
    title: 'Stage ' + (index + 1),
    clue: 'Choose the card with the matching route symbol.',
    options: ['Sun card', 'Moon card', 'Star card'], answerIndex: 0,
    explanation: 'The route symbol is the sun.', hint: 'Look at the top corner.',
    prerequisite: index ? 'CODE-' + index : 'START', unlock: 'CODE-' + (index + 1),
  })),
};

test('DeepSeek sends proposals, story, and audit to its Responses API', async () => {
  const env = { AI_PROVIDER: 'deepseek', DEEPSEEK_API_KEY: 'deepseek-test',
    DEEPSEEK_MODEL: 'deepseek-flash', OPENAI_API_KEY: 'openai-test', OPENAI_MODEL: 'gpt-test' };
  const calls = [];
  const fetcher = async (url, options) => {
    assert.equal(url, 'https://api.deepseek.com/responses');
    assert.equal(options.headers.authorization, 'Bearer deepseek-test');
    const request = JSON.parse(options.body);
    assert.equal(request.model, 'deepseek-flash');
    assert.deepEqual(request.reasoning, { effort: 'none' });
    assert.equal(request.text.format.type, 'json_schema');
    calls.push(request.text.format.name);
    const value = request.text.format.name === 'story_proposals'
      ? { proposals: [{ id: 'mystery', title: 'Lost note', summary: 'Find it.' },
        { id: 'mission', title: 'Garden route', summary: 'Follow it.' }] }
      : request.text.format.name === 'story_audit' ? { pass: true, issues: [] } : story;
    return Response.json({ id: 'resp-test', status: 'completed',
      output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(value) }] }],
      usage: { input_tokens: 12, output_tokens: 8 } });
  };
  assert.equal((await generateProposals(spec, env, fetcher)).proposals.length, 2);
  const result = await generateStory(spec, env, fetcher);
  assert.equal(result.story.stages.length, 5);
  assert.deepEqual(calls, ['story_proposals', 'paper_adventure', 'story_audit']);
  assert.equal(result.usage.input_tokens, 24);
});

test('a failed independent audit repairs the whole story once without weakening the quality gate', async () => {
  const env = { AI_PROVIDER: 'deepseek', DEEPSEEK_API_KEY: 'deepseek-test', DEEPSEEK_MODEL: 'deepseek-flash' };
  let audits = 0;
  const generationInputs = [];
  const fetcher = async (_, options) => {
    const request = JSON.parse(options.body);
    if (request.text.format.name === 'paper_adventure') {
      generationInputs.push(JSON.parse(request.input));
      return Response.json({ id: 'story-' + generationInputs.length, output: [{ content: [{ type: 'output_text', text: JSON.stringify(story) }] }], usage: { input_tokens: 12, output_tokens: 8 } });
    }
    audits++;
    return Response.json({ output: [{ content: [{ type: 'output_text', text: JSON.stringify(audits === 1
      ? { pass: false, issues: ['Stage 2 has two plausible answers.'] }
      : { pass: true, issues: [] }) }] }], usage: { input_tokens: 5, output_tokens: 2 } });
  };
  const result = await generateStory(spec, env, fetcher);
  assert.equal(generationInputs.length, 2);
  assert.equal(audits, 2);
  assert.match(generationInputs[1].qaIssues[0], /two plausible answers/);
  assert.equal(result.usage.input_tokens, 34);
});

test('an overlong generated explanation is regenerated before audit and PDF delivery', async () => {
  const env = { AI_PROVIDER: 'deepseek', DEEPSEEK_API_KEY: 'deepseek-test', DEEPSEEK_MODEL: 'deepseek-flash' };
  const overlong = { ...story, stages: story.stages.map((stage, index) => index === 0 ? { ...stage, explanation: 'x'.repeat(601) } : stage) };
  const inputs = [];
  let audits = 0;
  const fetcher = async (_, options) => {
    const request = JSON.parse(options.body);
    if (request.text.format.name === 'paper_adventure') {
      inputs.push(JSON.parse(request.input));
      const value = inputs.length === 1 ? overlong : story;
      return Response.json({ output: [{ content: [{ type: 'output_text', text: JSON.stringify(value) }] }], usage: { input_tokens: 10, output_tokens: 10 } });
    }
    audits++;
    return Response.json({ output: [{ content: [{ type: 'output_text', text: JSON.stringify({ pass: true, issues: [] }) }] }], usage: { input_tokens: 5, output_tokens: 5 } });
  };
  const result = await generateStory(spec, env, fetcher);
  assert.equal(inputs.length, 2);
  assert.equal(audits, 1);
  assert.match(inputs[1].qaIssues[0], /Answer explanation/);
  assert.equal(result.usage.input_tokens, 25);
});

test('provider choice is explicit and cannot silently send a DeepSeek job to OpenAI', () => {
  assert.equal(aiProvider({ DEEPSEEK_API_KEY: 'key' }).name, 'deepseek');
  assert.equal(aiProvider({ AI_PROVIDER: 'deepseek', OPENAI_API_KEY: 'openai-key', OPENAI_MODEL: 'model' }), null);
  assert.equal(aiProvider({ AI_PROVIDER: 'openai', OPENAI_API_KEY: 'openai-key', OPENAI_MODEL: 'model' }).name, 'openai');
});
