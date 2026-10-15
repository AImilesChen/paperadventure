import {assertGoalStillOpen} from '../shared/paper-contract.mjs';

const plain = (value,label,max) => {
  if(typeof value!=='string'||!value.trim()||value.length>max||/[^\x20-\x7e]/.test(value))
    throw Error(`${label} must be printable English under ${max} characters.`);
  return value.trim();
};
const danglingEnd=/\b(?:a|an|the|to|of|for|from|with|into|onto|at|by|as|and|or|but|because|so|than|that|which|who|whose|when|where|while|through|before|after|under|over|its|their|this|these|those)[.!?]?$/i;
const normalizeSentence=value=>String(value||'').replace(/\s+/g,' ').trim();
const completeBounded=(value,label,max)=>{
  const normalized=normalizeSentence(value);
  if(!normalized||/[^\x20-\x7e]/.test(normalized))throw Error(`${label} must be printable English under ${max} characters.`);
  const punctuated=/[.!?]$/.test(normalized)?normalized:`${normalized}.`;
  if(punctuated.length<=max&&!danglingEnd.test(punctuated))return punctuated;
  const sentences=normalized.match(/[^.!?]+[.!?]+/g)||[];
  let result='';
  for(const part of sentences){
    const next=`${result} ${part.trim()}`.trim();
    if(next.length>max)break;
    result=next;
  }
  if(result&&!danglingEnd.test(result))return result;
  throw Error(`${label} must contain a complete sentence under ${max} characters.`);
};
const sentence=(value,label,max)=>{
  return completeBounded(plain(value,label,max),label,max);
};
const fitted=(value,label,max,complete=false)=>{
  if(typeof value!=='string'||!value.trim()||/[^\x20-\x7e]/.test(value))
    throw Error(`${label} must be printable English under ${max} characters.`);
  let result=value.replace(/\s+/g,' ').trim();
  if(complete)return completeBounded(result,label,max);
  const limit=complete?max-1:max;
  if(result.length>limit)result=result.slice(0,limit).replace(/\s+\S*$/,'').trim();
  if(!result)throw Error(`${label} must be printable English under ${max} characters.`);
  return result.replace(/[,:;.!?\s]+$/,'');
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
const pendingDiscovery=/^(?:find|ask|inspect|check|look|search|visit|follow|trace|learn|discover|investigate)\b|\b(?:to|will) (?:reveal|learn|find|see|discover|show|explain|confirm)\b/i;
const causalLanguage=/\b(?:because|so|therefore|which (?:means|shows|allows|confirms)|making|makes|enables?|allows?|proves?|confirms?|needed|necessary|can be|can now|must be)\b/i;
const openPurpose=(value,index)=>completedOutcome.test(value)?[
  'This identifies a condition the team needs before choosing the final action.',
  'This locates something the team needs before choosing the final action.',
  'This establishes a safe preparation before the team attempts the final action.',
  'This identifies a usable route for carrying out the final action.',
][index]:value;

function strictPurposes(purposes,action){
  for(const [index,purpose] of purposes.entries()){
    if(pendingDiscovery.test(purpose))
      throw Error(`Checkpoint ${index+1} discovery must state the finding already learned, not promise a later investigation.`);
    if(!causalLanguage.test(purpose))
      throw Error(`Checkpoint ${index+1} discovery must explain why the finding supports the final action.`);
  }
  const terms=resolutionWords(action);
  const linked=purposes.filter(purpose=>[...terms].some(term=>new RegExp(`\\b${term}\\b`,'i').test(purpose))).length;
  if(linked<3)throw Error('At least three discoveries must directly name part of the intended final action.');
}

export function prepareStoryFrame(frame,qualityVersion=4){
  if(!frame||!Array.isArray(frame.actions)||frame.actions.length!==3||!Array.isArray(frame.purposes)||frame.purposes.length!==4)
    throw Error('The story frame needs one problem, three final actions and four discovery purposes.');
  let problem;
  try{problem=fitted(frame.problem,'Story-frame problem',180,true);}
  catch{problem='The mission is still blocked, and the team must use four discoveries to decide which action will work.';}
  const actions=frame.actions.map((value,index)=>compactAction(value,`Final action ${index+1}`,40));
  if(new Set(actions.map(value=>value.toLowerCase())).size!==3)throw Error('The story frame needs three distinct final actions.');
  if(actions.some(value=>/^(?:(?:restore|fix|solve|complete|save)\b|(?:final\s+)?action\b|option\b|choice\b)/i.test(value)))
    throw Error('Each final action must name a specific story action.');
  const purposes=frame.purposes.map((value,index)=>{
    let purpose;
    try{purpose=fitted(value,`Checkpoint ${index+1} discovery purpose`,100,true);}
    catch{purpose=purposeFallbacks[index];}
    return openPurpose(purpose,index);
  });
  if(purposes.some(value=>value.length<28||/\b(?:digit|code|correct answer|matching option|worksheet)\b/i.test(value)))
    throw Error('Each discovery purpose must explain a story consequence rather than an answer code.');
  if(qualityVersion>=5)strictPurposes(purposes,actions[0]);
  return {problem:concealResolution(problem,actions[0]),actions,purposes};
}

export function selectedStoryFinding(stage,type,number){
  const labels=stage?.material?.items?.map(item=>typeof item==='string'?item:item?.label)||[];
  if(type==='order_tiles')return labels.join(' > ');
  if(type==='symbol_key')return stage?.word||stage?.material?.logic?.context?.word;
  return labels[(number+1)%3];
}

const purposeFallbacks=[
  'This shows what the team must fix before choosing the final action.',
  'This identifies what the team needs before choosing the final action.',
  'This establishes the safe order needed for the final action.',
  'This identifies the route needed for the final action.',
];
const compactPurposeFallbacks=[
  'This finding guides the final action.',
  'This finding is needed for the final action.',
  'This sequence prepares the final action.',
  'This route enables the final action.',
];
const storyLead=(stage,type,number)=>{
  const finding=selectedStoryFinding(stage,type,number);
  const features=stage?.features||stage?.material?.logic?.context?.features||[];
  const subjects=features.map(value=>String(value).replace(/^(?:Mentions|Names)\s+/i,''));
  const lead=['evidence_cards','decision_record'].includes(type)&&subjects.length===2
    ? `${finding} contains both ${subjects[0]} and ${subjects[1]}.`
    :type==='order_tiles'?`${finding} is the checked story sequence.`
    :type==='symbol_key'?`${finding} message is the decoded story message.`
    :`${finding} is the only open story route.`;
  return {finding,lead};
};
const completeStoryLink=(lead,purpose,index,max=180)=>{
  let second;
  try{second=completeBounded(purpose,`Checkpoint ${index+1} story purpose`,Math.max(40,max-lead.length-1));}
  catch{second=purposeFallbacks[index];}
  if(`${lead} ${second}`.length<=max)return `${lead} ${second}`;
  const fallback=purposeFallbacks[index];
  if(`${lead} ${fallback}`.length<=max)return `${lead} ${fallback}`;
  const compact=compactPurposeFallbacks[index];
  if(`${lead} ${compact}`.length<=max)return `${lead} ${compact}`;
  if(lead.endsWith(' is the checked story sequence.')){
    const single=lead.replace(/ is the checked story sequence\.$/,' guides the final action.');
    if(single.length<=max)return single;
  }
  throw Error(`Checkpoint ${index+1} printed names leave no room for a complete story link.`);
};

export function compileStorySpine(frame,stages,types,qualityVersion=4){
  const checked=prepareStoryFrame(frame,qualityVersion),resolution=checked.actions[0];
  const links=stages.slice(0,4).map((stage,index)=>{
    const {lead}=storyLead(stage,types[index],index+1);
    return completeStoryLink(lead,checked.purposes[index],index);
  });
  return {problem:checked.problem,resolution,links};
}

export function validateStorySpine(spine,stages,types,goal,qualityVersion=4){
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
    const {finding,lead}=storyLead(stages[index],types[index],index+1);
    if(!finding)throw Error(`Checkpoint ${index+1} has no selected finding.`);
    if(/\b(?:answer code|result digit|correct answer|matching option)\b/i.test(reason))
      throw Error(`Checkpoint ${index+1} story link needs a fictional reason beyond the answer code.`);
    const exactFinding=reason.toLowerCase().includes(String(finding).toLowerCase());
    if(['evidence_cards','decision_record'].includes(types[index])){
      const features=stages[index]?.features||stages[index]?.material?.logic?.context?.features||[];
      if(features.length!==2)throw Error(`Checkpoint ${index+1} story link must cite both printed record facts.`);
      const missing=features.map(feature=>String(feature).replace(/^(?:Mentions|Names)\s+/i,'')).filter(subject=>!reason.toLowerCase().includes(subject.toLowerCase()));
      if(!exactFinding||missing.length){
        const originalPurpose=reason.replace(/^[^.!?]+[.!?]\s*/, '').trim()||purposeFallbacks[index];
        reason=completeStoryLink(lead,originalPurpose,index);
      }
    }else if(!exactFinding){
      const originalPurpose=reason.replace(/^[^.!?]+[.!?]\s*/, '').trim()||purposeFallbacks[index];
      reason=completeStoryLink(lead,originalPurpose,index);
    }
    reason=completeBounded(reason,`Checkpoint ${index+1} story link`,180);
    if(reason.length>180||danglingEnd.test(reason))throw Error(`Checkpoint ${index+1} story link must contain complete sentences.`);
    if(reason.length<Math.min(30,String(finding).length+15))
      throw Error(`Checkpoint ${index+1} story link needs a fictional reason beyond the answer code.`);
    if(qualityVersion>=5){
      if((reason.match(/[.!?](?:\s|$)/g)||[]).length<2)
        throw Error(`Checkpoint ${index+1} story link must state both the checked finding and its consequence.`);
      const consequence=reason.replace(lead,'').trim();
      if(pendingDiscovery.test(consequence))
        throw Error(`Checkpoint ${index+1} story link promises another investigation instead of stating its result.`);
      if(!causalLanguage.test(consequence))
        throw Error(`Checkpoint ${index+1} story link must explain why its finding supports the final action.`);
    }
    assertGoalStillOpen([reason],goal,index+1);
    return {finding,reason};
  });
  if(qualityVersion>=5)strictPurposes(links.map(link=>link.reason),resolution);
  return {problem,resolution,links};
}
