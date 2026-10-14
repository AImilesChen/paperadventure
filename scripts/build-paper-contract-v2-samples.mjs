import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {clockSpec,clockBlueprintContext} from '../content/paper-contract-qa.mjs';
import {prepareContextualBlueprint} from '../backend/contextual-puzzles.mjs';
import {generateStagedCheckpoint,assembleStagedStory} from '../backend/staged-story.mjs';
import {verifyPrintedPuzzles} from '../backend/paper-proof.mjs';
import {buildGamePdf} from '../backend/pdf.mjs';

const spec={...clockSpec,packExperienceVersion:2};
const context=structuredClone(clockBlueprintContext);
context.stages[2].material.items=['Inspect the idle signal','Align the spare wheel','Check the noon marker','Record the test result'].map(label=>({label}));
const blueprint=prepareContextualBlueprint(context,spec);
const stages=[];
for(let number=1;number<=5;number++)stages.push((await generateStagedCheckpoint(spec,blueprint,number,stages.at(-1),{},()=>{throw Error('A model call is not expected for the checked sample.');})).stage);
const story=assembleStagedStory(spec,blueprint,stages);
verifyPrintedPuzzles(story);
const output=resolve('tmp/pdfs');
await mkdir(output,{recursive:true});
for(const paper of ['A4','Letter'])for(const role of ['player','guide']){
  const filename=resolve(output,`paper-contract-v2-clock-${role}-${paper}.pdf`);
  await writeFile(filename,buildGamePdf(story,{...spec,paper},role));
  process.stdout.write(`${filename}\n`);
}
