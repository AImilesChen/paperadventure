import test from 'node:test';
import assert from 'node:assert/strict';
import { aiProvider, generateProposals, generateStory } from './openai.mjs';
import { validatePurchase } from './domain.mjs';
import { planFixture } from '../tests/fixtures/creator-plan-fixture.mjs';

const input = { sku: 'custom_home', customIdea: 'A garden map', players: 4, age: '8-10', paper: 'A4', direction: 'mission', proposalTitle: 'Garden route', proposalSummary: 'Follow clues around a paper garden.' };
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
    if (request.text.format.name === 'paper_adventure') {
      const selected = JSON.parse(request.input);
      assert.equal(selected.proposalTitle, 'Garden route');
      assert.equal(selected.proposalSummary, 'Follow clues around a paper garden.');
    }
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

test('failed quality checks retain the token usage and last provider response for cost accounting', async () => {
  const env = { AI_PROVIDER: 'deepseek', DEEPSEEK_API_KEY: 'deepseek-test' };
  let storyCalls = 0;
  let auditCalls = 0;
  const fetcher = async (_, options) => {
    const name = JSON.parse(options.body).text.format.name;
    if (name === 'paper_adventure') {
      storyCalls++;
      return Response.json({ id: `story-${storyCalls}`, output: [{ content: [{ type: 'output_text', text: JSON.stringify(story) }] }], usage: { input_tokens: 12, output_tokens: 8 } });
    }
    auditCalls++;
    return Response.json({ output: [{ content: [{ type: 'output_text', text: JSON.stringify({ pass: false, issues: ['The clue is ambiguous.'] }) }] }], usage: { input_tokens: 5, output_tokens: 2 } });
  };
  await assert.rejects(generateStory(spec, env, fetcher), failure => {
    assert.equal(failure.code, 'GENERATION_QA_FAILED');
    assert.deepEqual(failure.usage, { input_tokens: 51, output_tokens: 30 });
    assert.equal(failure.responseId, 'story-3');
    return true;
  });
  assert.equal(storyCalls, 3);
  assert.equal(auditCalls, 3);
});

test('the approved plan supplies exact headings while printable punctuation is normalized before QA', async () => {
  const {spec:base} = validatePurchase({sku:'custom_home',creatorVersion:3,customIdea:'A clock tower',players:4,age:'8-10',paper:'A4',gameplay:{primary:'reasoning',secondary:[]}});
  const plan = planFixture(base);
  const approved = {...base,plan,planConfirmed:true};
  const draft = {...story,title:'Paraphrased title',introduction:'Paraphrased opening',ending:'The team’s journey ends.',stages:story.stages.map((stage,index)=>({...stage,title:`Wrong ${index}`,mechanic:'sequence'}))};
  let calls = 0;
  const result = await generateStory(approved,{AI_PROVIDER:'deepseek',DEEPSEEK_API_KEY:'test'},async(_,options)=>{
    calls++;
    const value = JSON.parse(options.body).text.format.name === 'story_audit' ? {pass:true,issues:[]} : draft;
    return Response.json({output:[{content:[{type:'output_text',text:JSON.stringify(value)}]}],usage:{input_tokens:10,output_tokens:5}});
  });
  assert.equal(calls,2);
  assert.equal(result.story.title,plan.title);
  assert.equal(result.story.introduction,plan.opening);
  assert.equal(result.story.stages[0].title,plan.stages[0].title);
  assert.equal(result.story.stages[0].mechanic,plan.stages[0].mechanic);
  assert.equal(result.story.ending,"The team's journey ends.");
});

test('provider choice is explicit and cannot silently send a DeepSeek job to OpenAI', () => {
  assert.equal(aiProvider({ DEEPSEEK_API_KEY: 'key' }).name, 'deepseek');
  assert.equal(aiProvider({ AI_PROVIDER: 'deepseek', OPENAI_API_KEY: 'openai-key', OPENAI_MODEL: 'model' }), null);
  assert.equal(aiProvider({ AI_PROVIDER: 'openai', OPENAI_API_KEY: 'openai-key', OPENAI_MODEL: 'model' }).name, 'openai');
});
