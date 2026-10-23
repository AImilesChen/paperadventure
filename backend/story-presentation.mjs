import {verifyPrintedPuzzles} from './paper-proof.mjs';

// These are fictional paper props, not new observations or puzzle predicates.
// Select a vocabulary only from the adult-approved English plan, never from
// unchecked customer instructions, avoided topics or a fresh model response.
const profiles=[
  {id:'railway',match:/\b(train|railway|railroad|stationmaster|locomotive)\b/i,topic:'railway',host:'stationmaster',plan:'mail plan',
    parts:['dispatch','signal','platform','arrival'],records:['Guard log','Mail clerk note','Stationmaster report'],routes:['Platform path','Mail carriage path','Signal box path'],words:['MAIL','RAIL','POST','STAR']},
  {id:'clock',match:/\b(clock|clockwork|bell tower)\b/i,topic:'clock tower',host:'clock keeper',plan:'clock plan',
    parts:['gear','dial','signal','bell'],records:['Gear keeper log','Dial keeper note','Bell keeper report'],routes:['Dial passage','Gear room path','Bell stairway'],words:['GEAR','TIME','HOUR','TUNE']},
  {id:'hotel',match:/\b(hotel|inn|concierge)\b/i,topic:'hotel',host:'concierge',plan:'guest plan',
    parts:['reception','guest','corridor','luggage'],records:['Reception log','Guest note','Porter report'],routes:['Reception path','Guest corridor','Luggage passage'],words:['LIFT','LOCK','GATE','HOME']},
  {id:'forest',match:/\b(forest|woodland|ranger)\b/i,topic:'forest',host:'ranger',plan:'forest plan',
    parts:['trail','stream','clearing','camp'],records:['Trail log','Stream note','Ranger report'],routes:['Fern path','Stream path','Clearing path'],words:['LEAF','PINE','PATH','CAMP']},
  {id:'space',match:/\b(space|spaceport|spaceship|rocket|planet)\b/i,topic:'space',host:'commander',plan:'flight plan',
    parts:['launch','cabin','orbit','landing'],records:['Pilot log','Engineer note','Commander report'],routes:['Cabin passage','Dock walkway','Hangar path'],words:['STAR','SHIP','DOCK','LAND']},
  {id:'museum',match:/\b(museum|curator|gallery)\b/i,topic:'museum',host:'curator',plan:'exhibit plan',
    parts:['gallery','display','archive','exhibit'],records:['Gallery log','Archivist note','Curator report'],routes:['Gallery path','Archive passage','Exhibit walkway'],words:['GOLD','GIFT','MASK','TILE']},
];
const generic={id:'story',topic:'story',host:'host',plan:'story plan',parts:['opening','journey','discovery','arrival'],
  records:['Keeper log','Courier note','Explorer report'],routes:['North path','Garden path','Market path'],words:['LAMP','STAR','PATH','GEAR']};
export const hasStoryPresentation=spec=>spec?.packNarrativeBindingVersion===1&&spec.packStepDeliveryVersion===1;
export function storyProfile(spec){
  const plan=spec.plan;
  const approved=[plan.title,...(plan.themeAnchors||[])].join(' ');
  const profile=profiles.find(value=>value.match.test(approved));
  if(profile)return profile;
  // Unknown themes retain their exact approved title, scenes and goal. A short
  // literal anchor personalises headings without guessing objects or facts.
  const anchor=(plan.themeAnchors||[]).find(value=>/^[A-Za-z]+(?: [A-Za-z]+)?$/.test(value)&&value.length<=14);
  return {...generic,topic:anchor||generic.topic};
}

export function themedBaselineData(spec){
  const profile=storyProfile(spec),{topic,host,plan}=profile;
  return {profile,action:`Hand ${plan} to ${host}`,alternatives:[`Hold ${plan}`,`Store ${plan}`],
    orders:profile.parts.map(part=>[`Open ${part} log`,`Lay out ${part} notes`,`Gather ${part} slips`,`Prepare ${part} plan`]),
    features:[`Names ${plan}`,`Mentions ${host}`],
    title:index=>index===4?plan:`${topic} ${profile.parts[index]} papers`};
}

const selected=stage=>stage.options[stage.answerIndex].replace(/ \/ (?:digit )?[1-3]{1,4}$/,'');
const sentence=value=>/[.!?]$/.test(value)?value:`${value}.`;
function narratedOutcome(goal){
  // Keep the full approved action, object and deadline. An infinitive avoids
  // guessing conjugations in arbitrary compound goals; unknown grammar keeps
  // a literal quotation instead of inventing a different mission.
  if(/^(?:Help|Find|Restore|Recover|Return|Repair|Deliver|Rescue|Guide|Bring|Get|Make|Choose|Identify|Locate|Collect|Protect|Prepare|Reach|Stop|Build|Discover|Solve|Save|Complete|Uncover|Reconnect|Reunite|Open|Close|Send|Take|Put)\b/.test(goal))
    return `In the story, the team manages to ${goal[0].toLowerCase()+goal.slice(1)}`;
  return `The host narrates the successful completion of the approved mission: "${goal}"`;
}
function sceneOf(planned,topic){
  if(planned.scene)return sentence(planned.scene);
  // Keep an exact location prefix when older approved plans lack `scene`.
  // Do not retain an event promising a location/object absent from the puzzle.
  const first=planned.storyContext?.match(/^((?:At|In|Inside|Outside|Near|Beside|On|By)\b[^,.;!?]{1,72})[,.;!?]/i)?.[1];
  return first?sentence(first):`In the ${topic} story.`;
}
function storyLink(stage,topic){
  const chosen=selected(stage),type=stage.material.type;
  if(type==='order_tiles'){
    const labels=stage.material.items.map(item=>item.label);
    return `"${labels[0]}" comes before "${labels.at(-1)}". Keep the full sequence in the ${topic} record.`;
  }
  if(type==='symbol_key')return `The decoded label "${chosen}" identifies this ${topic} record. The team keeps it with the papers for the final decision.`;
  if(type==='route_board')return `"${chosen}" meets both printed route requirements. Keep this path in the ${topic} record; the final action is still ahead.`;
  const features=stage.material.logic.context.features;
  const full=`"${chosen}" matches "${features[0]}" and "${features[1]}". Keep this evidence in the ${topic} record.`;
  return full.length<=180?full:`"${chosen}" meets both printed requirements. Keep this evidence in the ${topic} record.`;
}
function bridge(stage,topic){
  if(stage.number===5)return 'Bring the four checked records together. Their saved digits select the final action; the adult then reads the story ending.';
  if(stage.material.type==='symbol_key')return `The key gives a label for this ${topic} record. Write the decoded label beside its digit and bring this record to the final decision.`;
  if(stage.material.type==='order_tiles')return `These papers contain preparation steps for the ${topic} mission. Use the printed order rules; keep the final action for checkpoint 5.`;
  if(stage.material.type==='route_board')return `Compare the drawn paths for this ${topic} mission. Only the printed route requirements decide which path to record.`;
  return `These ${topic} papers offer different accounts. Combine the printed facts to choose which account to keep for the final decision.`;
}

// This is a deterministic print view of the bound source, not an AI rewrite.
// Mechanics, facts, choices, answers and digits are never changed here. The
// renderer preflights BOTH roles and uses the unmodified source if it cannot fit.
export function presentPaperStory(story,spec){
  if(!hasStoryPresentation(spec)||story.deliveryCopy)return story;
  verifyPrintedPuzzles(story);
  const result=structuredClone(story),profile=storyProfile(spec),{topic,host}=profile,baseline=story.deliveryEdition==='baseline';
  for(const stage of result.stages){
    if(baseline){
      const scene=sceneOf(spec.plan.stages[stage.number-1],topic);
      stage.storyContext=`${scene} ${bridge(stage,topic)}`;
      if(stage.storyContext.length>220)throw Error('The printed story moment needs more room.');
    }
    if(stage.material.type==='symbol_key')stage.material.recordPrompt='Write the decoded label and its digit. Keep both for the final decision.';
    else if(baseline&&stage.number===5)stage.material.recordPrompt='Record the final action and all four earlier results that select it.';
  }
  if(baseline&&result.spine){
    result.spine.links=result.spine.links.map((link,index)=>({...link,reason:storyLink(result.stages[index],topic)}));
    if(result.spine.links.some(link=>link.reason.length>180))throw Error('The printed evidence summary needs more room.');
  }
  if(baseline){
    result.paperFinaleReason='Review all four paper records and their saved digits. Together they select the printed action. Read the story outcome only after the team checks its final choice.';
    const action=result.stages[4].material.items[0].label;
    result.paperHostBriefing=`You play the ${host}. Accept the chosen paper plan, then narrate the approved mission outcome. Fictional actions are acted out on paper; no extra prop or physical repair is required.`;
    result.ending=`The team chooses "${action}" and hands over its checked paper plan. ${sentence(narratedOutcome(spec.plan.goal))} The ${host} thanks the team. The four recorded digits are ${result.stages.slice(0,4).map(stage=>stage.material.logic.resultDigit).join('')}.`;
  }
  return result;
}

export function renderPresentedPair(story,spec,render){
  if(!hasStoryPresentation(spec)||story.deliveryCopy)return null;
  // A broken source is never eligible for presentation fallback.
  verifyPrintedPuzzles(story);
  try{
    const presented=presentPaperStory(story,spec);
    return {player:render(presented,spec,'player'),guide:render(presented,spec,'guide')};
  }catch{
    // One selection for both roles prevents mismatched Player/Guide editions.
    return {player:render(story,spec,'player'),guide:render(story,spec,'guide')};
  }
}
