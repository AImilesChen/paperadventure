import {assertGoalStillOpen} from '../shared/paper-contract.mjs';

const plain = (value,label,max) => {
  if(typeof value!=='string'||!value.trim()||value.length>max||/[^\x20-\x7e]/.test(value))
    throw Error(`${label} must be printable English under ${max} characters.`);
  return value.trim();
};
const sentence=(value,label,max)=>{
  const result=plain(value,label,max);
  return /[.!?]$/.test(result)?result:`${result}.`;
};
const fitted=(value,label,max,complete=false)=>{
  if(typeof value!=='string'||!value.trim()||/[^\x20-\x7e]/.test(value))
    throw Error(`${label} must be printable English under ${max} characters.`);
  let result=value.replace(/\s+/g,' ').trim();
  const limit=complete?max-1:max;
  if(result.length>limit)result=result.slice(0,limit).replace(/\s+\S*$/,'').trim();
  if(!result)throw Error(`${label} must be printable English under ${max} characters.`);
  return complete?`${result.replace(/[,:;.!?\s]+$/,'')}.`:result.replace(/[,:;.!?\s]+$/,'');
};

const actionFiller=new Set(['a','an','the','friendly','careful','carefully','nearby','correct','chosen','final','proper','safely','safe']);
const compactAction=(value,label,max=40)=>{
  if(typeof value!=='string'||!value.trim()||/[^\x20-\x7e]/.test(value))
    throw Error(`${label} must be printable English under ${max} characters.`);
  let result=value.replace(/\s+/g,' ').trim().replace(/[,:;.!?\s]+$/,'');
  if(result.length<=max)return result;
  const words=result.split(' '),withoutFiller=words.filter((word,index)=>index===0||!actionFiller.has(word.toLowerCase()));
  result=withoutFiller.join(' ');
  if(result.length<=max)return result;
  const first=withoutFiller[0],tail=withoutFiller.slice(1).filter(word=>!/^(?:very|really|quickly|slowly)$/i.test(word));
  while(tail.length>1&&`${first} ${tail.join(' ')}`.length>max)tail.splice(Math.max(0,tail.length-2),1);
  result=`${first} ${tail.join(' ')}`.trim();
  if(result.length>max)result=result.slice(0,max).replace(/\s+\S*$/,'').trim();
  if(result.split(/\s+/).length<2)throw Error(`${label} must name a complete action.`);
  return result;
};

const resolutionWords=value=>new Set(String(value||'').toLowerCase().match(/[a-z]{4,}/g)?.filter(word=>
  !['with','from','into','onto','over','under','before','after','using','through','bring','take','make','give','hand','place','carry','move','send','open','close','seal','join'].includes(word))||[]);
const concealResolution=(problem,action)=>{
  const words=resolutionWords(action),hits=[...words].filter(word=>new RegExp(`\\b${word}\\b`,'i').test(problem));
  return hits.length>=2?'The mission is still blocked, and the team must use four discoveries to decide which action will work.':problem;
};
const completedOutcome=/\b(?:heard|rings|rang|sounds|sounded|restored|repaired|rescued|saved|delivered|returned|completed|finished|won|recovered|solved)\b/i;
const openPurpose=(value,index)=>completedOutcome.test(value)?[
  'This identifies a condition the team needs before choosing the final action.',
  'This locates something the team needs before choosing the final action.',
  'This establishes a safe preparation before the team attempts the final action.',
  'This identifies a usable route for carrying out the final action.',
][index]:value;

export function prepareStoryFrame(frame){
  if(!frame||!Array.isArray(frame.actions)||frame.actions.length!==3||!Array.isArray(frame.purposes)||frame.purposes.length!==4)
    throw Error('The story frame needs one problem, three final actions and four discovery purposes.');
  const problem=fitted(frame.problem,'Story-frame problem',180,true);
  const actions=frame.actions.map((value,index)=>compactAction(value,`Final action ${index+1}`,40));
  if(new Set(actions.map(value=>value.toLowerCase())).size!==3)throw Error('The story frame needs three distinct final actions.');
  if(actions.some(value=>/^(?:(?:restore|fix|solve|complete|save)\b|(?:final\s+)?action\b|option\b|choice\b)/i.test(value)))
    throw Error('Each final action must name a specific story action.');
  const purposes=frame.purposes.map((value,index)=>openPurpose(fitted(value,`Checkpoint ${index+1} discovery purpose`,100,true),index));
  if(purposes.some(value=>value.length<28||/\b(?:digit|code|correct answer|matching option|worksheet)\b/i.test(value)))
    throw Error('Each discovery purpose must explain a story consequence rather than an answer code.');
  return {problem:concealResolution(problem,actions[0]),actions,purposes};
}

export function selectedStoryFinding(stage,type,number){
  const labels=stage?.material?.items?.map(item=>typeof item==='string'?item:item?.label)||[];
  if(type==='order_tiles')return labels.join(' > ');
  if(type==='symbol_key')return stage?.word||stage?.material?.logic?.context?.word;
  return labels[(number+1)%3];
}

export function compileStorySpine(frame,stages,types){
  const checked=prepareStoryFrame(frame),resolution=checked.actions[0];
  const links=stages.slice(0,4).map((stage,index)=>{
    const finding=selectedStoryFinding(stage,types[index],index+1);
    const features=stage.features||stage.material?.logic?.context?.features||[];
    const subjects=features.map(value=>String(value).replace(/^(?:Mentions|Names)\s+/i,''));
    const lead=['evidence_cards','decision_record'].includes(types[index])
      ? `${finding} contains both ${subjects[0]} and ${subjects[1]}.`
      :types[index]==='order_tiles'?`${finding} is the checked story sequence.`
      :types[index]==='symbol_key'?`${finding} is the decoded story message.`
      :`${finding} is the only open story route.`;
    const combined=`${lead} ${checked.purposes[index]}`;
    if(combined.length<=180)return combined;
    const allowance=Math.max(28,179-lead.length);
    return `${lead} ${checked.purposes[index].slice(0,allowance).replace(/\s+\S*$/,'').replace(/[,:;.!?\s]+$/,'')}.`;
  });
  return {problem:checked.problem,resolution,links};
}

export function validateStorySpine(spine,stages,types,goal){
  if(!spine||!Array.isArray(spine.links)||spine.links.length!==4||stages?.length!==5||types?.length!==5)
    throw Error('The game needs one problem, one final action and four linked findings.');
  const problem=plain(spine.problem,'Story problem',180);
  if(!/[.!?]$/.test(problem))throw Error('The story problem must be a complete sentence.');
  const firstAction=plain(stages[4]?.material?.items?.[0]?.label,'First final action',40);
  if(/^(?:restore|fix|solve|complete|save)\b/i.test(firstAction))
    throw Error('The final choice must name a specific repair or action, not restate the mission goal.');
  const resolution=firstAction;
  const links=spine.links.map((value,index)=>{
    let reason=plain(typeof value==='string'?value:value?.reason,`Checkpoint ${index+1} story link`,180);
    const finding=selectedStoryFinding(stages[index],types[index],index+1);
    if(!finding)throw Error(`Checkpoint ${index+1} has no selected finding.`);
    const labels=types[index]==='order_tiles'?stages[index].material.items.map(item=>item.label):[finding];
    if(types[index]==='order_tiles'&&!reason.toLowerCase().includes(finding.toLowerCase())){
      const lead=`${finding} is the checked story sequence.`;
      const tail=reason.replace(/^[^.!?]+[.!?]\s*/, '').trim();
      reason=`${lead} ${tail||'This finding gives the team information needed before choosing the final action.'}`;
    }else if(!labels.some(label=>reason.toLowerCase().includes(String(label).toLowerCase())))
      reason=`${types[index]==='order_tiles'?labels[0]:finding}: ${reason}`;
    if(['evidence_cards','decision_record'].includes(types[index])){
      const features=stages[index]?.features||stages[index]?.material?.logic?.context?.features||[];
      if(features.length!==2)throw Error(`Checkpoint ${index+1} story link must cite both printed record facts.`);
      const missing=features.map(feature=>String(feature).replace(/^(?:Mentions|Names)\s+/i,'')).filter(subject=>!reason.toLowerCase().includes(subject.toLowerCase()));
      if(missing.length)reason=`${finding} mentions ${missing.join(' and ')}. ${reason}`;
    }
    if(reason.length>180){const cut=reason.slice(0,176).replace(/\s+\S*$/,'').replace(/[,:;.!?\s]+$/,'');reason=`${cut}.`;}
    if(reason.length<Math.min(30,String(finding).length+15)||/\b(?:answer code|result digit|correct answer|matching option)\b/i.test(reason))
      throw Error(`Checkpoint ${index+1} story link needs a fictional reason beyond the answer code.`);
    assertGoalStillOpen([reason],goal,index+1);
    return {finding,reason};
  });
  return {problem,resolution,links};
}

