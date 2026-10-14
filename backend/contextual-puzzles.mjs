import {paperContractTypes,paperActions,paperAction,validatePaperPlan,assertGoalStillOpen} from '../shared/paper-contract.mjs';

const text=(value,label,max)=>{
  if(typeof value!=='string'||!value.trim()||value.length>max||/[^\x20-\x7e]/.test(value))throw Error(`${label} must be concise printable English (maximum ${max}).`);
  return value.trim();
};
const unique=values=>new Set(values.map(value=>value.toLowerCase())).size===values.length;
const rotate=(values,shift)=>values.map((_,i)=>values[(i+shift)%values.length]);
export function buildContextPuzzle(number,type,context,previousDigits=[],experienceVersion=1){
  const labels=context.labels;
  const shift=number%3;
  let items,options,answer,clue,hint,explanation,instruction,signature;
  const winning=(number+1)%3;
  if(number===5){
    if(previousDigits.length!==4||previousDigits.some(value=>!['1','2','3'].includes(value)))throw Error('The finale requires all four saved result digits.');
    const code=previousDigits.join('');
    const codes=[code,code.slice(0,2)+(String(Number(code[2])%3+1))+code[3],String(Number(code[0])%3+1)+code.slice(1)];
    answer=0;options=labels.map((label,i)=>`${label} / ${codes[i]}`);
    items=labels.map((label,i)=>({label,detail:`Final action code: ${codes[i]}`}));
    items.push({label:'Your saved results',detail:'Checkpoint 1: ____   2: ____   3: ____   4: ____'});
    instruction='Fill the four blanks using your own recorded results. Read the digits in checkpoint order and compare every digit.';
    clue='Use your records from checkpoints 1-4. Choose the action whose four-digit code matches all four results in order.';
    hint='Bring back the four earlier sheets. Check one digit at a time; do not guess from the action name.';
    explanation=`The saved result digits, in order, are ${code}. Only ${labels[0]} carries this complete code.`;
    signature='combine-four-results';
  }else if(type==='order_tiles'){
    const [a,b,c,d]=labels;
    const variant=number%3;
    const rules=variant===0
      ? [`Before ${b}.`,`After ${a}; before ${c}.`,`After ${b}; before ${d}.`,`After ${c}.`]
      : variant===1
      ? ['This step is first.',`Immediately after ${a}.`,`Immediately before ${d}.`,'This step is last.']
      : [`Before ${b} and ${c}.`,`Before ${c}; after ${a}.`,`Before ${d}.`,`After every other step.`];
    items=labels.map((label,i)=>({label,detail:rules[i]}));
    options=[[a,c,b,d],[a,b,c,d],[b,a,d,c]].map(value=>value.join(' > '));answer=1;
    instruction='Number the four pieces in an order that follows every printed rule. Compare your arrangement with the three choices.';
    clue='Use every before-and-after rule. Decide the first and last steps, then check the middle pair. Record the result digit for your chosen order.';
    hint='Find the piece that must come before the others; check every neighbouring pair.';
    explanation=`Every rule requires ${a} > ${b} > ${c} > ${d}. The other choices break a printed relationship.`;
    signature=`order-four-steps-${variant}`;
  }else if(type==='symbol_key'){
    const word=context.word;
    items=Array.from(word,(letter,i)=>({label:String(i+1),detail:`${letter}`}));
    options=[word,(word[0]==='A'?'Z':'A')+word.slice(1),word.slice(0,3)+(word[3]==='A'?'Z':'A')];answer=0;
    if(!unique(options))throw Error('The printed word needs distinct code choices.');
    instruction='Write the key letter under each number in the message 1-2-3-4. Read the letters in that order.';
    clue='The message is 1-2-3-4. Decode it using all four rows of the printed key, then record the result digit for the matching word.';
    hint='Keep the message order. A key row tells you one letter, not the whole answer.';
    explanation=`The four key rows decode 1-2-3-4 as ${word}. Every other choice changes the printed order.`;
    signature=`decode-${word}`;
  }else if(type==='decision_record'&&experienceVersion>=2){
    const [feature1,feature2]=context.features;
    const patterns=rotate([[true,true],[true,false],[false,true]],(3-winning)%3);
    items=labels.map((label,i)=>({label,detail:`${feature1}: ${patterns[i][0]?'YES':'NO'}. ${feature2}: ${patterns[i][1]?'YES':'NO'}. Result digit: ${i+1}.`}));
    items.push({label:'Witness record 1',detail:`The right choice has ${feature1}: YES.`},{label:'Witness record 2',detail:`The right choice has ${feature2}: YES.`});
    options=labels;answer=patterns.findIndex(value=>value.every(Boolean));
    instruction='Read the two witness records, then mark both properties on each candidate. Compare the remaining candidate with the three choices.';
    clue='Each witness gives one required property. Use both records and the candidate details to find the only match; save its result digit.';
    hint='One witness leaves two possible candidates. Check the second property before choosing.';
    explanation=`Only ${labels[answer]} matches both witness properties: ${feature1} and ${feature2}.`;
    signature=`combine-witness-properties-${context.features.join('-')}`;
  }else if(type==='decision_record'){
    const rejected=[0,1,2].filter(i=>i!==winning);
    items=labels.map((label,i)=>({label,detail:`Candidate ${i+1}. Result digit: ${i+1}.`}));
    items.push({label:'Witness 1',detail:`I checked the clue. It rules out ${labels[rejected[0]]}.`},{label:'Witness 2',detail:`My separate clue rules out ${labels[rejected[1]]}.`});
    options=labels;answer=winning;
    instruction='Read both witness statements. Cross out only the named rejected candidates. Compare the candidate that remains.';
    clue='Both witnesses are reliable. Use both statements to eliminate candidates. Record the remaining candidate and its printed result digit.';
    hint='One witness leaves two candidates. You need the other witness before choosing.';
    explanation=`Witness 1 excludes ${labels[rejected[0]]}; witness 2 excludes ${labels[rejected[1]]}. Only ${labels[winning]} remains.`;
    signature=`combine-two-exclusions-${winning}`;
  }else if(type==='route_board'&&experienceVersion>=2){
    const routes=rotate([['OPEN','OPEN'],['CLOSED','OPEN'],['OPEN','CLOSED']],(3-winning)%3);
    items=labels.map((label,i)=>({label,detail:`START > ${label} > END. First link: ${routes[i][0]}. Second link: ${routes[i][1]}. Digit: ${i+1}.`}));
    items.push({label:'Route rule',detail:'Trace from START to END. Both links must be OPEN. A CLOSED link stops the route.'});
    options=labels;answer=routes.findIndex(value=>value.every(state=>state==='OPEN'));
    instruction='Trace each branch from START through its named stop to END. Cross out a branch when either printed link is CLOSED.';
    clue='Only a continuous route reaches END. Trace the first and second link of each branch and record the open route\'s digit.';
    hint='Start at the left of each branch. A CLOSED link prevents you from reaching END.';
    explanation=`Only ${labels[answer]} has two OPEN links from START to END. The other branches stop at a CLOSED link.`;
    signature='trace-open-two-link-path';
  }else{
    const [feature1,feature2]=context.features;
    const patterns=rotate([[true,true],[true,false],[false,true]],(3-winning)%3);
    items=labels.map((label,i)=>({label,detail:`${feature1}: ${patterns[i][0]?'YES':'NO'}. ${feature2}: ${patterns[i][1]?'YES':'NO'}. Digit: ${i+1}.`}));
    items.push({label:'Printed rule',detail:`Choose a ${type==='route_board'?'route':'piece'} with YES for both ${feature1} and ${feature2}.`} );
    options=labels;answer=patterns.findIndex(value=>value.every(Boolean));
    instruction=type==='route_board'?'Trace the three printed route rows. Compare both required route conditions before choosing.':'Compare the two facts on every evidence piece with the separate printed rule.';
    clue=`The printed rule requires both ${feature1} and ${feature2}. Check both facts on every ${type==='route_board'?'route':'piece'}, then record its result digit.`;
    hint='A candidate with just one YES does not pass. Check the other fact as well.';
    explanation=`Only ${labels[answer]} has YES for both ${feature1} and ${feature2}. Each other candidate fails one requirement.`;
    signature=type==='route_board'?'trace-two-conditions':`match-two-features-${context.features.join('-')}`;
  }
  const digit=String(answer+1);
  if(number!==5 && ['order_tiles','symbol_key'].includes(type))options=options.map((option,i)=>`${option} / digit ${i+1}`);
  const material={type,title:context.title,instruction,recordPrompt:number===5?'Record your final action and the four earlier results that prove it.':'Record the chosen result and its digit. Keep this sheet for checkpoint 5.',items,
    logic:{version:1,contractVersion:1,...(experienceVersion>=2?{experienceVersion:2}:{}),context,number,previousDigits,signature,resultDigit:number===5?null:digit}};
  const task=paperAction(type,number).task;
  return {number,question:task,evidence:clue,options:rotate(options,shift),answerIndex:(answer-shift+3)%3,material,
    clue,hint,explanation,task,teamwork:number===5?'Each explorer checks one earlier result. Compare all four before agreeing on the final action.':'One explorer reads, one handles the pieces, one checks the rule, and one records. Rotate these jobs after this checkpoint.',
    unlock:number===5?'The four discoveries identify the final action. Read the ending together.':`Keep result digit ${digit}. Hand out checkpoint ${number+1}, Player pages ${number*2+2}-${number*2+3}.`};
}

export function prepareContextualBlueprint(candidate,spec){
  validatePaperPlan(spec.plan);
  if(candidate?.stages?.length!==5)throw Error('A five-checkpoint contextual blueprint is required.');
  const types=paperContractTypes(spec.plan),digits=[],stages=[];
  for(let i=0;i<5;i++){
    const raw=candidate.stages[i],type=types[i],count=i===4?3:type==='order_tiles'?4:type==='symbol_key'?4:3;
    const labels=raw.material?.items?.slice(0,count).map(piece=>text(typeof piece==='string'?piece:piece.label,'Piece label',40));
    if(labels?.length!==count||!unique(labels)||labels.some(label=>/^(?:plain fact|rule clue|witness|final action|journey clue)\s+[a-z0-9]+$/i.test(label)))throw Error(`Checkpoint ${i+1} needs ${count} distinct story-specific labels, not placeholder names.`);
    if(spec.packExperienceVersion>=2&&i<4)assertGoalStillOpen(labels,spec.plan.goal,i+1);
    if(spec.packExperienceVersion>=2&&i<4&&type!=='symbol_key'&&labels.some(label=>/\b(?:checkpoint|digit|digits|tile|tiles|printed|rule|rules|choice|choices|option|options|answer|answers|matching card|decoded word|report cards|both conditions)\b/i.test(label)))
      throw Error(`Checkpoint ${i+1} labels must name fictional story pieces or actions, not instructions about the worksheet.`);
    if(spec.packExperienceVersion>=2&&i<4&&type==='decision_record'&&labels.some(label=>/^(?:witness|statement|clue|candidate|option|answer|result|rule)\b/i.test(label)))
      throw Error(`Checkpoint ${i+1} witness candidates must name story objects or actions, not the witness notes or answer roles.`);
    const features=(['evidence_cards','route_board'].includes(type)||spec.packExperienceVersion>=2&&type==='decision_record')&&i<4?raw.features?.map(value=>text(value,'Printed feature',32)):['Checked fact','Matching fact'];
    if(features?.length!==2||!unique(features))throw Error('Each activity needs two distinct story-specific feature names.');
    if(spec.packExperienceVersion>=2&&i<4&&['evidence_cards','decision_record'].includes(type)&&features.some(value=>/\b(?:answer|choice|candidate|digit|result|correct|wrong|rule|clue|match|matches|fits|remaining|remain|ruled out|eliminated|true|false|yes|no|condition|property|fact|facts|printed|both|must)\b/i.test(value)))
      throw Error(`Checkpoint ${i+1} needs two concrete story properties, not answer or puzzle-state labels.`);
    const word=type==='symbol_key'?text(raw.word,'Printed key word',4).toUpperCase():'NOTE';
    if(!/^[A-Z]{4}$/.test(word))throw Error('The printed word must contain four ASCII letters.');
    const context={labels,features,word,title:text(raw.material.title,'Material title',45)};
    const compiled=buildContextPuzzle(i+1,type,context,digits.slice(),spec.packExperienceVersion||1);
    const stage={...compiled,title:spec.plan.stages[i].title,mechanic:spec.plan.stages[i].mechanic};
    stages.push(stage);if(i<4)digits.push(compiled.material.logic.resultDigit);
  }
  if(new Set(stages.slice(0,4).map(stage=>stage.material.logic.signature)).size!==4)throw Error('The first four activities repeat the same puzzle; distinct variations are required.');
  const usePrintedEnding=spec.plan.stages.some(stage=>stage.scene)||candidate.celebration!==undefined;
  const celebration=typeof candidate.celebration==='string'&&candidate.celebration.length<=240&&!/witness|evidence|because|decoded words|date rule|clue proves/i.test(candidate.celebration)?text(candidate.celebration,'Celebration',240):'The team celebrates the completed mission.';
  const ending=usePrintedEnding?`The four checked results form the code ${digits.join('')}. This code matches "${stages[4].material.items[0].label}" on the final sheet. The team completes that action and reaches its mission goal. ${celebration}`:text(candidate.ending,'Ending',1000);
  if(!/[.!?]$/.test(ending))throw Error('The ending must be a complete sentence.');
  return {ending,...(usePrintedEnding?{celebration}:{}),groupInstructions:spec.setting==='classroom'?'Each crew uses its own complete Player set and keeps its own four result digits. Rotate the four jobs after each checkpoint; the teacher checks each result before releasing the next pages.':'',stages};
}

export function validateContextualPuzzle(stage){
  const logic=stage.material?.logic;
  if(logic?.contractVersion!==1||logic.number!==stage.number)throw Error('The unified paper contract is missing.');
  const expected=buildContextPuzzle(stage.number,stage.material.type,logic.context,logic.previousDigits,logic.experienceVersion||1);
  for(const field of ['options','answerIndex','material','task','teamwork','unlock'])if(JSON.stringify(stage[field])!==JSON.stringify(expected[field]))throw Error(`Checkpoint ${stage.number} ${field} differs from its unified paper contract.`);
  for(const field of ['question','evidence'])if(stage[field]!=null&&stage[field]!==expected[field])throw Error(`Checkpoint ${stage.number} ${field} differs from its unified paper contract.`);
  const style=stage.logicStyle||'base';
  const text=contextualStageText(stage,style);
  for(const field of ['clue','hint','explanation'])if(stage[field]!=null&&stage[field]!==text[field])throw Error(`Checkpoint ${stage.number} ${field} differs from its unified paper contract.`);
  return stage;
}

export function contextualStageText(stage,style='base'){
  const expected=buildContextPuzzle(stage.number||stage.material.logic.number,stage.material.type,stage.material.logic.context,stage.material.logic.previousDigits,stage.material.logic.experienceVersion||1);
  const {clue,hint,explanation}=expected;
  if(style==='simple')return {clue:`Read the rule aloud. ${clue}`,hint:'Check one printed piece at a time.',explanation};
  if(style==='guided')return {clue,hint:`${hint} Point to the printed proof.`,explanation};
  if(style==='clear')return {clue:`Read, compare, then record. ${clue}`,hint,explanation};
  if(style!=='base')throw Error('Unsupported contract wording.');
  return {clue,hint,explanation};
}
