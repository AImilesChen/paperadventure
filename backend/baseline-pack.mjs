import {recoverSavedBlueprintSteps,generateStagedCheckpoint,assembleStagedStory} from './staged-story.mjs';
import {paperContractTypes} from '../shared/paper-contract.mjs';
import {verifyPrintedPuzzles} from './paper-proof.mjs';
import {buildGamePdf} from './pdf.mjs';
import {hasStoryPresentation,themedBaselineData} from './story-presentation.mjs';

// A paper-only mission briefing, built from the adult-approved story. The
// host narrates the approved outcome after the players present their plan;
// children never need an unprinted prop or an invented physical repair.
async function buildBaselineEdition(spec,themed=null){
  if(spec.packStepDeliveryVersion!==1||!spec.planConfirmed)throw Error('A confirmed step-delivery plan is required.');
  const theme=(spec.plan.themeAnchors||[]).find(value=>/^[a-zA-Z ]{3,14}$/.test(value))||'mission';
  // Arbitrary theme words must not become puzzle rules or proof predicates.
  // Keep the fail-safe paper action stable; the approved story stays in the
  // opening, scenes, mission and ending, and theme headings are display only.
  const action=themed?.action||'Hand mission plan to host';
  const frame={problem:'The team needs four checked discoveries before presenting its mission plan.',
    actions:[action,...(themed?.alternatives||['Hold mission plan','Store mission plan'])],
    discoveries:Array.from({length:4},()=>({finding:'The mission plan is available for the team.',
      consequence:'The mission plan guides the team before the final action.',supportsAction:action}))};
  const types=paperContractTypes(spec.plan);
  const orders=[['Open travel journal','Lay out journey map','Gather team notes','Prepare mission plan'],
    ['Open keeper ledger','Lay out mission letter','Gather keeper notes','Prepare team briefing'],
    ['Open explorer log','Lay out explorer map','Gather explorer notes','Prepare story briefing'],
    ['Open courier journal','Lay out courier map','Gather courier notes','Prepare courier briefing']];
  const materials=types.map((type,index)=>({material:{title:themed?themed.title(index):index===4?'Mission plan':`${theme} briefing ${index+1}`,items:(index===4?frame.actions:
    type==='order_tiles'?(themed?.orders||orders)[index]:type==='symbol_key'?['1','2','3','4']:
    type==='route_board'?(themed?.profile.routes||['Garden path','Courtyard path','Orchard path']):
    themed?.profile.records||['Keeper journal','Courier letter','Explorer report']).map(label=>({label}))},
    features:themed?.features||['Names mission plan','Mentions team briefing'],word:(themed?.profile.words||['LAMP','STAR','PATH','GEAR'])[index%4]}));
  const goal=spec.plan.goal.trim().replace(/[.!?]+$/,'');
  const celebration=`Mission accomplished: ${goal}. Everyone cheers for the team.`;
  const blueprint=recoverSavedBlueprintSteps(spec,frame,materials,celebration);
  if(!blueprint)throw Error('The approved plan cannot form a baseline pack.');
  const stages=[];
  for(let number=1;number<=5;number++)stages.push((await generateStagedCheckpoint(spec,blueprint,number,stages.at(-1),{})).stage);
  const story={...assembleStagedStory(spec,blueprint,stages),deliveryEdition:'baseline'};
  if(verifyPrintedPuzzles(story).length!==5)throw Error('The baseline needs five proven printed puzzles.');
  // Optional vocabulary must also survive a later paper-size PDF rebuild.
  // Keep the established edition's requested-paper check unchanged.
  for(const paper of themed?['A4','Letter']:[spec.paper])
    for(const role of ['player','guide'])buildGamePdf(story,{...spec,paper},role);
  return {blueprint,story};
}

export async function buildBaselinePack(spec){
  // Prove the established edition first. Optional vocabulary improvements
  // cannot remove the delivery path before any enhancement call is made.
  const fallback=await buildBaselineEdition(spec);
  if(!hasStoryPresentation(spec))return fallback;
  try{return await buildBaselineEdition(spec,themedBaselineData(spec));}
  catch{return fallback;}
}
