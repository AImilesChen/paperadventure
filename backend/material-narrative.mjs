// Optional display text, compiled from the final printed activity. This module
// has no provider, database, queue or allowance access. It never renames a piece.
export const hasMaterialNarrative=spec=>spec?.packMaterialNarrativeVersion===1&&spec.packStepDeliveryVersion===1&&spec.gamePackVersion===2;

const events={
 order_tiles:'The team uses the printed rules to arrange preparation steps, then saves the result for the final decision.',
 symbol_key:'The team decodes a label using the printed key. Keep the label and its result digit for the final decision.',
 evidence_cards:'The team compares the printed records and checks both required facts before saving a result.',
 route_board:'The team compares the printed routes against their rules and saves the matching route and result.',
 decision_record:'The team shares both printed role clues, checks the candidate records and saves the matching result.',
};
const shortEvents={
 order_tiles:'Arrange the preparation steps using the printed rules. Save the result.',
 symbol_key:'Decode the printed label and save it with its result digit.',
 evidence_cards:'Check both required facts in the printed records. Save the result.',
 route_board:'Check the printed route rules and save the matching result.',
 decision_record:'Share both printed role clues and save the matching record and result.',
};
const finale='Bring the four saved results together. Match their digits to the final action, then let the adult read the ending.';
const sentence=value=>/[.!?]$/.test(value)?value:`${value}.`;
function location(planned,topic){
 // Only the structured approved location is retained. Do not reuse the full
 // storyContext event, which may promise a discovery absent from these pieces.
 if(typeof planned.scene==='string'&&planned.scene.trim())return sentence(planned.scene.trim());
 const prefix=planned.storyContext?.match(/^((?:At|In|Inside|Outside|Near|Beside|On|By)\b[^,.;!?]{1,72})[,.;!?]/i)?.[1];
 return prefix?sentence(prefix):`In the ${topic} story.`;
}
function checkpointScene(stage,planned,topic){
 const place=location(planned,topic),event=stage.number===5?finale:events[stage.material.type];
 if(!event)throw Error('No material-bound narration for this activity.');
 const full=`${place} ${event}`;
 if(full.length<=220)return full;
 const brief=`${place} ${stage.number===5?'Match the four saved digits to the final action. The adult then reads the ending.':shortEvents[stage.material.type]}`;
 if(brief.length>220)throw Error('The approved place and complete paper action need more room.');
 return brief;
}
function discovery(stage){
 const answer=stage.options[stage.answerIndex].replace(/ \/ digit [1-3]$/,'');
 let text;
 if(stage.material.type==='order_tiles'){
  // Read the solved option, not the physical item array order.
  const order=answer.split(' > ');if(order.length!==4)throw Error('The printed sequence is unavailable.');
  text=`"${order[0]}" comes before "${order.at(-1)}". Keep the checked sequence and its result digit for the final decision.`;
 }else if(stage.material.type==='symbol_key')text=`The printed key decodes the label "${answer}". Keep the label and its result digit with the other checked records.`;
 else if(stage.material.type==='route_board')text=`"${answer}" meets the printed route rules. Keep this route and its result digit for the final decision.`;
 else if(stage.material.type==='decision_record')text=`Both printed role clues select "${answer}". Keep this record and its result digit for the final decision.`;
 else if(stage.material.type==='evidence_cards')text=`"${answer}" meets both printed requirements. Keep this evidence and its result digit for the final decision.`;
 else throw Error('The printed discovery is unsupported.');
 if(text.length>180)throw Error('The complete printed discovery needs more room.');
 return text;
}

export function presentMaterialNarrative(story,spec,{topic='story'}={}){
 const result=structuredClone(story);
 for(const stage of result.stages){
  stage.storyContext=checkpointScene(stage,spec.plan.stages[stage.number-1],topic);
 }
 if(result.spine){
  result.spine.links=result.spine.links.map((link,index)=>({...link,reason:discovery(result.stages[index])}));
  result.paperFinaleReason='The four checked paper records supply the saved digits. Together they select the printed final action; read the story outcome after the team checks that choice.';
 }
 return result;
}

function fixedContent(story){
 const result=structuredClone(story);
 for(const stage of result.stages)delete stage.storyContext;
 for(const link of result.spine?.links||[])delete link.reason;
 delete result.paperFinaleReason;
 return JSON.stringify(result);
}

// The caller supplies an already rendered, verified pair from the unchanged
// delivery path. Optional failures return these exact bytes, with no rerender.
export function renderMaterialNarrativePair(original,spec,render,profile,improve=presentMaterialNarrative){
 try{
  const presented=improve(structuredClone(original.printedStory),spec,profile);
  if(fixedContent(presented)!==fixedContent(original.printedStory))throw Error('Optional narration changed protected game content.');
  const player=render(presented,spec,'player'),guide=render(presented,spec,'guide');
  return {player,guide,printedStory:presented};
 }catch{return original;}
}
