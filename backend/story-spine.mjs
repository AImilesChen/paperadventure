import {assertGoalStillOpen} from '../shared/paper-contract.mjs';

const plain = (value,label,max) => {
  if(typeof value!=='string'||!value.trim()||value.length>max||/[^\x20-\x7e]/.test(value))
    throw Error(`${label} must be printable English under ${max} characters.`);
  return value.trim();
};

export function selectedStoryFinding(stage,type,number){
  const labels=stage?.material?.items?.map(item=>typeof item==='string'?item:item?.label)||[];
  if(type==='order_tiles')return labels.join(' > ');
  if(type==='symbol_key')return stage?.word||stage?.material?.logic?.context?.word;
  return labels[(number+1)%3];
}

export function validateStorySpine(spine,stages,types,goal){
  if(!spine||!Array.isArray(spine.links)||spine.links.length!==4||stages?.length!==5||types?.length!==5)
    throw Error('The game needs one problem, one final action and four linked findings.');
  const problem=plain(spine.problem,'Story problem',180);
  if(!/[.!?]$/.test(problem))throw Error('The story problem must be a complete sentence.');
  plain(spine.resolution,'Final action',40);
  const firstAction=plain(stages[4]?.material?.items?.[0]?.label,'First final action',40);
  if(/^(?:restore|fix|solve|complete|save)\b/i.test(firstAction))
    throw Error('The final choice must name a specific repair or action, not restate the mission goal.');
  const resolution=firstAction;
  const links=spine.links.map((value,index)=>{
    let reason=plain(typeof value==='string'?value:value?.reason,`Checkpoint ${index+1} story link`,180);
    const finding=selectedStoryFinding(stages[index],types[index],index+1);
    if(!finding)throw Error(`Checkpoint ${index+1} has no selected finding.`);
    const labels=types[index]==='order_tiles'?stages[index].material.items.map(item=>item.label):[finding];
    if(!labels.some(label=>reason.toLowerCase().includes(String(label).toLowerCase())))
      reason=`${types[index]==='order_tiles'?labels[0]:finding}: ${reason}`;
    if(['evidence_cards','decision_record'].includes(types[index])){
      const features=stages[index]?.features||stages[index]?.material?.logic?.context?.features||[];
      if(features.length!==2)throw Error(`Checkpoint ${index+1} story link must cite both printed record facts.`);
      const missing=features.map(feature=>String(feature).replace(/^(?:Mentions|Names)\s+/i,'')).filter(subject=>!reason.toLowerCase().includes(subject.toLowerCase()));
      if(missing.length)reason=`${finding} mentions ${missing.join(' and ')}. ${reason}`;
    }
    if(reason.length>180){const cut=reason.slice(0,176).replace(/\s+\S*$/,'').replace(/[,:;.!?\s]+$/,'');reason=`${cut}.`;}
    if(reason.length<Math.min(30,String(finding).length+15)||/\b(?:digit|code|correct answer|matching option)\b/i.test(reason))
      throw Error(`Checkpoint ${index+1} story link needs a fictional reason beyond the answer code.`);
    assertGoalStillOpen([reason],goal,index+1);
    return {finding,reason};
  });
  return {problem,resolution,links};
}

