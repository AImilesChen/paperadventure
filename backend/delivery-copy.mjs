// Keep puzzle proofs immutable while giving the *printed* game coherent prose.
// Every rewritten row is assembled from the original truth table, not an AI
// answer key. This contract is shared by review, rendering and publication.
import {verifyPrintedPuzzles} from './paper-proof.mjs';

export const COPY_POLICY='printed-causal-copy-1';
const fail=message=>{throw Object.assign(Error(message),{code:'DELIVERY_COPY_INVALID',terminalThemeMismatch:true});};
const text=(value,label,max,sentence=false)=>{
  if(typeof value!=='string'||!value.trim()||value.length>max||/[^\x20-\x7e]/.test(value))fail(`${label} needs printable English within ${max} characters.`);
  if(sentence&&(!/[.!?]$/.test(value)||/\b(?:and|or|the|a|to|from|with|because|so)[.!?]$/i.test(value)))fail(`${label} needs a complete sentence.`);
  return value.trim();
};
const distinct=values=>new Set(values.map(value=>value.toLowerCase())).size===values.length;
const actionVerb=/^(?:align|ask|attach|bring|build|carry|check|close|collect|cross|deliver|draw|fit|fold|follow|gather|give|go|hand|head|inspect|join|keep|leave|lift|light|lock|look|lower|move|open|pack|pass|place|prepare|press|pull|push|put|raise|read|remove|repair|replace|reset|return|ring|rotate|send|set|slide|start|stop|take|test|tie|turn|unlock|use|walk|wait)\b/i;
const records=stage=>stage.number<5&&['decision_record','evidence_cards'].includes(stage.material.type);
const factsIn=item=>[...item.detail.matchAll(/: (YES|NO)\./g)].map(match=>match[1]==='YES');
const chosen=(stage,labels)=>labels[stage.material.items.findIndex(item=>item.label===stage.options[stage.answerIndex])];

export function validateDeliveryCopy(story,copy){
  verifyPrintedPuzzles(story);
  if(copy?.version!==1||copy.stages?.length!==5||copy.actions?.length!==3||copy.links?.length!==4)fail('The printed edition is incomplete.');
  text(copy.celebration,'Closing',240,true);
  if((copy.celebration.match(/[.!?](?: |$)/g)||[]).length<2)fail('The closing needs an outcome and a character response.');
  for(const [index,action] of copy.actions.entries()){
    text(action.label,`Action ${index+1} label`,40);
    text(action.description,`Action ${index+1} instructions`,140,true);
    if(!actionVerb.test(action.label)||!actionVerb.test(action.description))fail('Final actions must start with an instruction verb.');
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
    if(stage.material.type==='order_tiles'&&part.labels.some(label=>!actionVerb.test(label)))fail('Order tiles need complete in-world instructions.');
    if(part.facts?.length!==(records(stage)?2:0))fail('Record stages need exactly two facts; other puzzles cannot gain hidden conditions.');
    for(const fact of part.facts){
      text(fact.yes,'Positive printed fact',66,true);text(fact.no,'Alternative printed fact',66,true);
      if(fact.yes===fact.no||/^(?:Mentions|Names)\b/i.test(fact.yes))fail('Printed facts must be statements, not keyword checks.');
      if([fact.yes,fact.no].some(value=>(value.match(/[.!?]/g)||[]).length!==1))fail('Each printed fact must be one sentence.');
    }
    if(records(stage)&&!distinct(part.facts.flatMap(fact=>[fact.yes,fact.no])))fail('Printed record facts must differ.');
  }
  const printed=applyDeliveryCopy(story,copy,false);
  verifyDeliveryPuzzles(printed);
  for(const [index,link] of copy.links.entries()){
    text(link.fact,'Cited printed fact',100,true);text(link.reason,'Story consequence',110,true);
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
