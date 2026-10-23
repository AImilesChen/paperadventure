import {recoverSavedBlueprintSteps,generateStagedCheckpoint,assembleStagedStory} from './staged-story.mjs';
import {paperContractTypes} from '../shared/paper-contract.mjs';
import {verifyPrintedPuzzles} from './paper-proof.mjs';
import {buildGamePdf} from './pdf.mjs';

// A paper-only mission briefing, built from the adult-approved story. The
// host narrates the approved outcome after the players present their plan;
// children never need an unprinted prop or an invented physical repair.
export async function buildBaselinePack(spec){
  if(spec.packStepDeliveryVersion!==1||!spec.planConfirmed)throw Error('A confirmed step-delivery plan is required.');
  const theme=(spec.plan.themeAnchors||[]).find(value=>/^[a-zA-Z ]{3,14}$/.test(value)&&! /\b(?:restored|repaired|rescued|saved|delivered|returned|completed|finished|won|recovered|solved)\b/i.test(value))||'mission';
  const action=`Hand ${theme.toLowerCase()} plan to host`;
  const frame={problem:'The team needs four checked discoveries before presenting its mission plan.',
    actions:[action,`Hold ${theme.toLowerCase()} plan`,`Store ${theme.toLowerCase()} plan`],
    discoveries:Array.from({length:4},()=>({finding:'The mission plan is available for the team.',
      consequence:'The mission plan guides the team before the final action.',supportsAction:action}))};
  const types=paperContractTypes(spec.plan);
  const orders=[['Open travel journal','Lay out journey map','Gather team notes','Prepare mission plan'],
    ['Open keeper ledger','Lay out mission letter','Gather keeper notes','Prepare team briefing'],
    ['Open explorer log','Lay out explorer map','Gather explorer notes','Prepare story briefing'],
    ['Open courier journal','Lay out courier map','Gather courier notes','Prepare courier briefing']];
  const materials=types.map((type,index)=>({material:{title:index===4?`${theme} plan`:`${theme} briefing ${index+1}`,items:(index===4?frame.actions:
    type==='order_tiles'?orders[index]:type==='symbol_key'?['1','2','3','4']:
    type==='route_board'?['Garden path','Courtyard path','Orchard path']:
    ['Keeper journal','Courier letter','Explorer report']).map(label=>({label}))},
    features:['Names mission plan','Mentions team briefing'],word:['LAMP','STAR','PATH','GEAR'][index%4]}));
  const goal=spec.plan.goal.trim().replace(/[.!?]+$/,'');
  const celebration=`Mission accomplished: ${goal}. Everyone cheers for the team.`;
  const blueprint=recoverSavedBlueprintSteps(spec,frame,materials,celebration);
  if(!blueprint)throw Error('The approved plan cannot form a baseline pack.');
  const stages=[];
  for(let number=1;number<=5;number++)stages.push((await generateStagedCheckpoint(spec,blueprint,number,stages.at(-1),{})).stage);
  const story={...assembleStagedStory(spec,blueprint,stages),deliveryEdition:'baseline'};
  if(verifyPrintedPuzzles(story).length!==5)throw Error('The baseline needs five proven printed puzzles.');
  // Test the actual requested layout before the first enhancement call.
  for(const role of ['player','guide'])buildGamePdf(story,spec,role);
  return {blueprint,story};
}
