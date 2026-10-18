// Keep puzzle proofs immutable while giving the *printed* game coherent prose.
// Every rewritten row is assembled from the original truth table, not an AI
// answer key. This contract is shared by review, rendering and publication.
import {verifyPrintedPuzzles} from './paper-proof.mjs';
import {unsupportedLocationClaims} from '../shared/printed-evidence.mjs';

export const COPY_POLICY='printed-causal-copy-1';
const fail=message=>{throw Object.assign(Error(message),{code:'DELIVERY_COPY_INVALID',terminalThemeMismatch:true});};
const text=(value,label,max,sentence=false)=>{
  if(typeof value!=='string'||!value.trim()||value.length>max||/[^\x20-\x7e]/.test(value))fail(`${label} needs printable English within ${max} characters.`);
  if(sentence&&(!/[.!?]$/.test(value)||/\b(?:and|or|the|a|to|from|with|because|so)[.!?]$/i.test(value)))fail(`${label} needs a complete sentence.`);
  return value.trim();
};
const distinct=values=>new Set(values.map(value=>value.toLowerCase())).size===values.length;
// Grammar is checked by the independent review. A finite English verb list
// wrongly rejected valid instructions such as Retrieve, Restore and Examine.
// Reject obvious noun lists/determiner fragments here without pretending that
// unknown words are invalid English verbs.
const instruction=value=>/^[A-Za-z][A-Za-z'-]*\s+\S/.test(value)&&!/^(?:a|an|the|this|that|these|those|our|your|their|it|they|he|she)\b/i.test(value)&&!/^[A-Za-z'-]+,/.test(value);
const records=stage=>stage.number<5&&['decision_record','evidence_cards'].includes(stage.material.type);
const factsIn=item=>[...item.detail.matchAll(/: (YES|NO)\./g)].map(match=>match[1]==='YES');
const chosen=(stage,labels)=>labels[stage.material.items.findIndex(item=>item.label===stage.options[stage.answerIndex])];

const typography=value=>typeof value==='string'?value.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[\u2018\u2019]/g,"'").replace(/[\u201c\u201d]/g,'"').replace(/[\u2013\u2014]/g,'-').replace(/[\u00a0\u202f]/g,' ').replace(/\s+/g,' ').trim():Array.isArray(value)?value.map(typography):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).map(([key,item])=>[key,typography(item)])):value;
export function printedFactChoices(story,copy,index){
  const stage=story.stages[index],part=copy.stages[index];
  if(records(stage))return part.facts.map(fact=>fact.yes);
  if(stage.material.type==='order_tiles')return part.labels.map(label=>`${label}.`);
  if(stage.material.type==='symbol_key')return [`The key spells ${stage.options[stage.answerIndex].split(' / ')[0]}.`];
  return [stage.material.items.find(item=>item.label===stage.options[stage.answerIndex])?.detail];
}
const citationWords=value=>new Set((String(value).toLowerCase().match(/[a-z0-9]+/g)||[]).filter(word=>!['a','an','the','is','are','has','have','on','in','of','at'].includes(word)));
function savedSpecificClosing(story){
  // The controlled engine prefixes the earned celebration with the checked
  // code and selected action. Reuse only that complete saved celebration,
  // never a sliced model response or an invented generic success message.
  const match=String(story.ending||'').match(/^The four checked results form code [1-3]{4}, which matches "[^"]+" on the final sheet\. (.+)$/);
  const value=match?typography(match[1]):'';
  return value&&value.length<=240&&!/[^\x20-\x7e]/.test(value)&&/[.!?]$/.test(value)&&
    !/\b(?:and|or|the|a|to|from|with|because|so)[.!?]$/i.test(value)&&
    (value.match(/[.!?](?: |$)/g)||[]).length===2&&
    !/result is visible|mission complete|everyone in the story cheers/i.test(value)?value:null;
}
// New outputs reference a numbered fact. Existing saved drafts keep their
// provider text; only a uniquely equivalent citation is restored verbatim.
// Any change still needs a review bound to the resulting exact edition.
export function normalizeDeliveryCopy(story,input){
  const copy=typography(structuredClone(input));
  if(copy?.links&&!Array.isArray(copy.links)&&typeof copy.links==='object')copy.links=story.stages.slice(0,4).map(stage=>copy.links[`checkpoint_${stage.number}`]);
  if(copy?.stages?.length!==5||copy.actions?.length!==3||copy.links?.length!==4)return copy;
  // Shorten only redundant wording; never slice an instruction or remove its
  // action, object, destination or deadline to make an overlong field fit.
  copy.actions.forEach(action=>{
    if(typeof action.label==='string'&&action.label.length>40)action.label=action.label.replace(/,\s+then\s+/i,'; ');
    if(typeof action.description!=='string'||action.description.length<=140)return;
    action.description=action.description.replace(/\bthe friendly shopkeeper\b/gi,'the shopkeeper');
    if(action.description.length>140)action.description=action.description.replace(/\s+waiting there\b/i,'');
    if(action.description.length>140)action.description=action.description.replace(/,\s+then\s+/i,'; ');
    if(action.description.length>140)action.description=action.description.replace(/,\s+and\s+/i,'; ');
  });
  if(copy.materialLabels){
    story.stages.forEach((stage,index)=>{if(stage.number<5&&(records(stage)||stage.material.type==='order_tiles'))copy.stages[index].labels=copy.materialLabels[`checkpoint_${stage.number}`];});
    delete copy.materialLabels;
  }
  if(copy.recordFacts){
    story.stages.forEach((stage,index)=>{if(records(stage))copy.stages[index].facts=copy.recordFacts[`checkpoint_${stage.number}`];});
    delete copy.recordFacts;
  }
  // One pair of fact sentences is reused across all three candidate rows.
  // A provider may write the selected record's name as their subject, which
  // would falsely identify every distractor as that selected record.
  story.stages.forEach((stage,index)=>{
    if(!records(stage))return;
    const part=copy.stages[index],labels=[...(part.labels||[])].sort((a,b)=>b.length-a.length);
    const sharedSubject=value=>{
      if(typeof value!=='string')return value;
      const matched=labels.find(label=>value.toLowerCase().startsWith(`${label.toLowerCase()} `));
      return matched?`This record${value.slice(matched.length)}`:value;
    };
    part.facts=part.facts?.map(fact=>({yes:sharedSubject(fact.yes),no:sharedSubject(fact.no)}));
  });
  // An overlong new celebration need not discard a previously saved complete
  // specific ending. The exact substituted edition still needs its own audit.
  if(typeof copy.celebration==='string'&&copy.celebration.length>240){
    const saved=savedSpecificClosing(story);if(saved)copy.celebration=saved;
  }
  copy.stages[4].labels=copy.actions.map(action=>action.label);
  // Facts are printed only on record puzzles. Extra response metadata for
  // ordering, keys, routes or final actions is not a new puzzle condition.
  story.stages.forEach((stage,index)=>{if(!records(stage))copy.stages[index].facts=[];});
  story.stages.slice(0,4).forEach((stage,index)=>{
    if(stage.material.type==='symbol_key')copy.stages[index].labels=['1','2','3','4'];
    if(stage.material.type==='route_board')copy.stages[index].labels=stage.material.items.slice(0,3).map(item=>item.label);
  });
  copy.links=copy.links.map((link,index)=>{
    const choices=printedFactChoices(story,copy,index);
    if(Number.isInteger(link.factIndex)){
      if(link.factIndex<0||link.factIndex>=choices.length)fail(`Checkpoint ${index+1} fact reference is out of range.`);
      return {fact:choices[link.factIndex],reason:link.reason};
    }
    if(choices.includes(link.fact))return {fact:link.fact,reason:link.reason};
    const words=citationWords(link.fact),same=choices.filter(fact=>{
      const target=citationWords(fact);
      return words.size===target.size&&[...words].every(word=>target.has(word));
    });
    return {fact:same.length===1?same[0]:link.fact,reason:link.reason};
  });
  return copy;
}

export const validateDeliveryCopy=(story,copy)=>validateCopy(story,copy);
// Preparation only: check all retained fields before purchasing a fact-only
// repair. This never supplies the full validation required by publication.
export const validateFactRepairBase=(story,copy)=>validateCopy(story,copy,true);
function validateCopy(story,copy,fieldsOnly=false){
  verifyPrintedPuzzles(story);
  if(copy?.version!==1||copy.stages?.length!==5||copy.actions?.length!==3||copy.links?.length!==4)fail('The printed edition is incomplete.');
  text(copy.celebration,'Closing',240,true);
  if((copy.celebration.match(/[.!?](?: |$)/g)||[]).length<2)fail('The closing needs an outcome and a character response.');
  for(const [index,action] of copy.actions.entries()){
    text(action.label,`Action ${index+1} label`,40);
    text(action.description,`Action ${index+1} instructions`,140,true);
    if(!instruction(action.label)||!instruction(action.description))fail('Final actions need complete instructions rather than noun lists.');
  }
  if(!distinct(copy.actions.map(action=>action.label))||!distinct(copy.actions.map(action=>action.description)))fail('Final actions must differ.');
  for(const [index,stage] of story.stages.entries()){
    const part=copy.stages[index],count=stage.number===5?3:stage.material.items.slice(0,['order_tiles','symbol_key'].includes(stage.material.type)?4:3).length;
    text(part.title,'Checkpoint title',55);text(part.scene,'Story event',200,true);
    if(part.labels?.length!==count||!distinct(part.labels))fail('Printed piece identities must remain distinct.');
    part.labels.forEach(value=>text(value,'Printed piece label',40));
    if(stage.number===5&&JSON.stringify(part.labels)!==JSON.stringify(copy.actions.map(action=>action.label)))fail('Final labels must match their instructions.');
    if(stage.material.type==='symbol_key'&&part.labels.join('')!=='1234')fail('The key rows cannot change.');
    if(stage.material.type==='route_board'&&JSON.stringify(part.labels)!==JSON.stringify(stage.material.items.slice(0,3).map(item=>item.label)))fail('Keep the checked route names.');
    if(stage.material.type==='order_tiles'&&part.labels.some(label=>!instruction(label)))fail('Order tiles need complete in-world instructions.');
    if(part.facts?.length!==(records(stage)?2:0)&&!(fieldsOnly&&records(stage)&&part.facts?.length===1))fail('Record stages need exactly two facts; other puzzles cannot gain hidden conditions.');
    if(fieldsOnly&&records(stage))continue;
    for(const fact of part.facts){
      // 66 is a generation target. Retain complete facts within the existing
      // cited-finding bound; the renderer checks every actual record/card box.
      text(fact.yes,'Positive printed fact',100,true);text(fact.no,'Alternative printed fact',100,true);
      if(fact.yes===fact.no||/^(?:Mentions|Names)\b/i.test(fact.yes))fail('Printed facts must be statements, not keyword checks.');
      if([fact.yes,fact.no].some(value=>(value.match(/[.!?]/g)||[]).length!==1))fail('Each printed fact must be one sentence.');
      if([fact.yes,fact.no].some(value=>part.labels.some(label=>value.toLowerCase().includes(label.toLowerCase()))))
        fail('Shared record facts must describe each candidate, not name one particular record.');
    }
    if(records(stage)&&!distinct(part.facts.flatMap(fact=>[fact.yes,fact.no])))fail('Printed record facts must differ.');
  }
  const printed=fieldsOnly?null:applyDeliveryCopy(story,copy,false);
  if(printed)verifyDeliveryPuzzles(printed);
  for(const [index,link] of copy.links.entries()){
    text(link.fact,'Cited printed fact',100,true);
    // 110 is the model writing target, not the capacity of the printed link.
    // Preserve complete supplied sentences within one combined 220-character
    // finding/reason block. Actual page-fit checks still run before review.
    text(link.reason,'Story consequence',220-link.fact.length-1,true);
    if(fieldsOnly)continue;
    const stage=printed.stages[index],available=records(stage)?copy.stages[index].facts.map(fact=>fact.yes):stage.material.type==='order_tiles'?copy.stages[index].labels.map(label=>`${label}.`):stage.material.type==='symbol_key'?[`The key spells ${stage.options[stage.answerIndex].split(' / ')[0]}.`]:[stage.material.items.find(item=>item.label===stage.options[stage.answerIndex])?.detail];
    if(!available.includes(link.fact))fail(`Checkpoint ${index+1} must cite an exact printed finding.`);
  }
  return structuredClone(copy);
}

export function applyDeliveryCopy(story,copy=story.deliveryCopy,check=true){
  if(!copy)return story;
  if(check)validateDeliveryCopy(story,copy);
  const result=structuredClone(story);delete result.deliveryCopy;
  result.stages=result.stages.map((original,index)=>{
    const part=copy.stages[index],stage={...original,title:part.title,storyContext:part.scene,material:structuredClone(original.material)},oldLabels=original.material.items.map(item=>item.label);
    const rename=value=>oldLabels.slice(0,part.labels.length).map((label,i)=>({label,i})).sort((a,b)=>b.label.length-a.label.length).reduce((out,{label,i})=>out.split(label).join(`\u0001${i}\u0001`),value).replace(/\u0001(\d)\u0001/g,(_,i)=>part.labels[Number(i)]);
    stage.material.items=stage.material.items.map((item,i)=>({...item,label:part.labels[i]||item.label,detail:rename(item.detail)}));
    stage.options=stage.options.map(rename);
    if(records(stage)){
      stage.material.items=stage.material.items.map((item,i)=>i<3?{...item,detail:part.facts.map((fact,j)=>factsIn(original.material.items[i])[j]?fact.yes:fact.no).join(' ')+` Result digit: ${i+1}.`}:item);
      stage.material.logic.copyFacts=part.facts;
      if(stage.material.type==='decision_record'){
        stage.material.items[3].detail=`The reliable record confirms: ${part.facts[0].yes}`;
        stage.material.items[4].detail=`The reliable record confirms: ${part.facts[1].yes}`;
        stage.clue='Both witnesses describe the same reliable record. Find the only record that agrees with both statements, then save its digit.';
      }else{
        stage.material.items[3].detail=`Find the record that confirms both statements: ${part.facts[0].yes} ${part.facts[1].yes}`;
        stage.clue='Read the separate instruction and the three records. Choose the record that confirms both required statements, then save its digit.';
      }
      stage.task='Compare the written records. Choose the one that satisfies both stated conditions.';
      stage.material.instruction='Read each record as two statements. Check both against the witness statements or separate instruction. Only one record agrees with both.';
      stage.hint='A record that agrees with only one statement does not pass. Check its second statement.';
      stage.explanation=`Only ${chosen(original,part.labels)} confirms both statements: ${part.facts.map(fact=>fact.yes).join(' ')}`;
    }else{
      for(const field of ['clue','hint','explanation','task'])stage[field]=rename(original[field]||'');
    }
    if(stage.number===5){
      stage.material.items.slice(0,3).forEach((item,i)=>{item.detail=`${copy.actions[i].description} ${original.material.items[i].detail}`;});
      stage.task='Combine the four saved digits. Read the full instructions for the action with the matching code.';
      stage.clue='Copy the digits from checkpoints 1-4 in order. Match all four digits, then read that action on the next sheet.';
      stage.explanation=`The four saved digits form ${story.stages.slice(0,4).map(item=>item.material.logic.resultDigit).join('')}. This selects ${copy.actions[0].label}. ${copy.actions[0].description}`;
    }
    return stage;
  });
  result.spine={...story.spine,resolution:copy.actions[0].description,links:copy.links.map(link=>({finding:link.fact,reason:`${link.fact} ${link.reason}`}))};
  const code=story.stages.slice(0,4).map(stage=>stage.material.logic.resultDigit).join('');
  result.ending=`The four checked results form code ${code}, which matches "${copy.actions[0].label}" on the final sheet. ${copy.celebration}`;
  return result;
}

// Solve the final visible edition independently. For rewritten records the
// solver reads the actual printed witness/rule sentences and candidate rows.
// Run after the final copy is applied: the blueprint's older links are not
// evidence for facts introduced while rewriting the printable edition.
export function validatePlayerEvidence(story){
  for(const [index,link] of (story.spine?.links||[]).entries()){
    if(index>=4)break;
    const stage=story.stages[index],items=stage.material.items;
    const chosen=items.find(item=>item.label===stage.options[stage.answerIndex]);
    const printed=[stage.storyContext,stage.clue,stage.material.instruction,link.finding,
      ...(stage.material.type==='order_tiles'?items.slice(0,4):chosen?[chosen]:[]).flatMap(item=>[item.label,item.detail])].filter(Boolean).join(' ');
    // The normalized copy prints finding + reason together, but only the
    // consequence is a claim that needs independent source evidence.
    const reason=link.reason.slice(link.finding.length).trim();
    const missing=unsupportedLocationClaims(reason,printed);
    if(missing.length)fail(`Checkpoint ${index+1} claims a location absent from its player material: ${missing[0]}.`);
  }
  return story;
}

// Solve the final visible edition independently. For rewritten records the
// solver reads the actual printed witness/rule sentences and candidate rows.
export function verifyDeliveryPuzzles(story){
  const proxy=structuredClone(story);
  for(const stage of proxy.stages){
    if(records(stage)&&stage.material.logic.copyFacts){
      const items=stage.material.items,required=stage.material.type==='decision_record'?items.slice(3).map(item=>item.detail.replace(/^The reliable record confirms: /,'')):items[3].detail.replace(/^Find the record that confirms both statements: /,'').match(/[^.!?]+[.!?]/g)?.map(value=>value.trim());
      if(required?.length!==2||new Set(required).size!==2)fail('The visible rule needs two distinct complete facts.');
      const matches=items.slice(0,3).filter(item=>required.every(fact=>item.detail.includes(fact)));
      if(matches.length!==1||stage.options[stage.answerIndex]!==matches[0].label)fail('Visible record facts disagree with the checked answer.');
      const digit=matches[0].detail.match(/Result digit: ([1-3])\.$/)?.[1];
      if(digit!==stage.material.logic.resultDigit)fail('The visible result digit changed.');
      // The general independent solver consumes the derived visible truth
      // table; it does not read the original hidden source table.
      items.slice(0,3).forEach(item=>{item.detail=required.map((fact,i)=>`Visible fact ${i+1}: ${item.detail.includes(fact)?'YES':'NO'}.`).join(' ')+` ${stage.material.type==='decision_record'?'Result digit':'Digit'}: ${item.detail.match(/Result digit: ([1-3])\.$/)[1]}.`;});
      if(stage.material.type==='decision_record')items.slice(3).forEach((item,i)=>{item.detail=`The right choice has Visible fact ${i+1}: YES.`;});
      else items[3].detail='Choose a piece with YES for both Visible fact 1 and Visible fact 2.';
    }
    if(stage.number===5)stage.material.items.slice(0,3).forEach(item=>{item.detail=item.detail.match(/Final action code: [1-3]{4}$/)?.[0]||'';});
  }
  return verifyPrintedPuzzles(proxy);
}
