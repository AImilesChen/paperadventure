import test from 'node:test';
import assert from 'node:assert/strict';
import { validatePurchase } from './domain.mjs';
import { generateProposals } from './openai.mjs';
const input = { sku:'custom_home', customIdea:'A paper garden', players:4, age:'8-10', paper:'A4', direction:'mission', preferences:{characters:' A robot ',goal:'Find a map',include:'Teamwork',avoid:'Scary scenes',unknown:'ignored'} };
test('preferences survive validation as bounded, named fields', () => {
  const {spec} = validatePurchase(input);
  assert.deepEqual(spec.preferences,{characters:'A robot',goal:'Find a map',include:'Teamwork',avoid:'Scary scenes'});
  assert.throws(() => validatePurchase({...input,preferences:{goal:'x'.repeat(181)}}));
});
test('validated preferences reach AI story-direction input', async () => {
  const {spec} = validatePurchase(input);
  let request;
  await generateProposals(spec,{AI_PROVIDER:'deepseek',DEEPSEEK_API_KEY:'fake'},async(url,options) => {
    request=JSON.parse(options.body);
    return new Response(JSON.stringify({output:[{content:[{type:'output_text',text:JSON.stringify({proposals:[{id:'mystery',title:'Map',summary:'Find a paper map.'},{id:'mission',title:'Garden',summary:'Help a garden robot.'}]})}]}]}),{status:200});
  });
  assert.equal(JSON.parse(request.input).preferences.avoid,'Scary scenes');
});
