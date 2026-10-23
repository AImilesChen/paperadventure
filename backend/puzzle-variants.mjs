import {shapeSymbols,stablePuzzleSeed} from '../shared/puzzle-variants.mjs';

const rotate=(values,by)=>values.slice(by).concat(values.slice(0,by));
export function puzzleVariantStage(base,context){
  const stage=structuredClone(base),{number,material}=stage,{labels,features,word,variant,seed}=context;
  const winning=base.material.logic.resultDigit?Number(base.material.logic.resultDigit)-1:0;
  if(number<5)switch(variant){
    case 'evidence-match':break;
    case 'evidence-crosscheck':{
      const [first,second]=features;
      const facts=material.items.slice(0,3).map(item=>[...item.detail.matchAll(/: (YES|NO)\./g)].map(match=>match[1]));
      material.items=labels.map((label,i)=>({label,detail:`Record ${i+1}. ${first}: ${facts[i][0]}. Digit: ${i+1}.`}));
      material.items.push({label:'Cross-check register',detail:`${second}. ${facts.map((fact,i)=>`Record ${i+1}: ${fact[1]}.`).join(' ')}`},
        {label:'Printed rule',detail:'Match record numbers with the register. Both required facts must be YES.'});
      material.instruction='Read each record, then match its number to the separate register. Combine both facts before choosing.';
      stage.clue='Each record supplies one fact. The register supplies the other. Match their record numbers and choose YES for both facts; save its digit.';
      stage.hint='A YES on a record is not enough. Check the same record number in the register.';
      stage.explanation=`Only ${labels[winning]} has YES on its own record and on the matching register entry.`;
      break;
    }
    case 'order-links':case 'order-positions':{
      const [a,b,c,d]=labels;
      const rules=variant==='order-links'?[`Before ${b}.`,`After ${a}; before ${c}.`,`After ${b}; before ${d}.`,`After ${c}.`]:
        ['This step is first.',`Immediately after ${a}.`,`Immediately before ${d}.`,'This step is last.'];
      material.items=labels.map((label,i)=>({label,detail:rules[i]}));
      stage.hint=variant==='order-links'?'Join every before-and-after link, then check all four positions.':'Find the first and last pieces, then use the neighbouring-step rules.';
      break;
    }
    case 'code-numbers':case 'code-shapes':{
      const symbols=variant==='code-shapes'?shapeSymbols:['1','2','3','4'];
      const by=stablePuzzleSeed(`${seed}:${number}:message`)%4;
      const message=rotate(symbols,by);
      material.items=symbols.map(label=>({label,detail:word[message.indexOf(label)]}));
      stage.clue=`The message is ${message.join('-')}. Use all four rows of the printed key, then record the digit for the matching word.`;
      material.instruction=`Read the message ${message.join('-')}. Use the key to write one letter for each ${variant==='code-shapes'?'shape':'number'}, in message order.`;
      stage.explanation=`The key decodes ${message.join('-')} as ${word}. The other choices disagree with a printed key entry.`;
      stage.hint='Follow message order, which can differ from key order. Use every key entry once.';
      break;
    }
    case 'route-links':break;
    case 'route-conditions':{
      const conditions=['Crossing open','Landing clear'];
      const patterns=rotate([[true,true],[true,false],[false,true]],(3-winning)%3);
      material.items=labels.map((label,i)=>({label,detail:`${conditions[0]}: ${patterns[i][0]?'YES':'NO'}. ${conditions[1]}: ${patterns[i][1]?'YES':'NO'}. Digit: ${i+1}.`}));
      material.items.push({label:'Route rule',detail:`Choose a route with YES for both ${conditions[0]} and ${conditions[1]}.`});
      material.instruction='Compare both printed conditions on each route. Rule out a route when either required condition is NO.';
      stage.clue='Check both route conditions. Choose the single route with YES for both, then record its digit.';
      stage.hint='A route with only one YES cannot pass both conditions.';
      stage.explanation=`Only ${labels[winning]} meets both printed route conditions. Each other route has a NO.`;
      break;
    }
    case 'witness-properties':case 'witness-exclusions':{
      const witnesses=variant==='witness-properties'?features.map(feature=>`The right choice has ${feature}: YES.`):
        labels.filter((_,i)=>i!==winning).map(label=>`This report rules out ${label}.`);
      material.items=material.items.slice(0,3).concat(witnesses.map((detail,i)=>({label:i?'Checker clue 2':'Reader clue 1',detail})));
      material.instruction='Give clue 1 to Reader and clue 2 to Checker. Each shares only their own clue. Combine both before choosing. Without cutting, the adult reads each clue to its reader.';
      stage.clue=variant==='witness-properties'?'Reader and Checker each share one required property. Combine both clues with the candidate records, then save the matching digit.':
        'Reader and Checker each share one exclusion. Cross out both named records, then save the digit of the remaining record.';
      stage.hint=variant==='witness-properties'?'One property leaves two candidates. Ask the other reader for the second property.':'One exclusion leaves two candidates. Ask the other reader which second record is ruled out.';
      stage.explanation=variant==='witness-properties'?`Only ${labels[winning]} satisfies both witness properties.`:
        `The two clues rule out ${labels.filter((_,i)=>i!==winning).join(' and ')}. Only ${labels[winning]} remains.`;
      break;
    }
    default:throw Error('Unsupported puzzle variant.');
  }
  if(number===5&&variant!=='finale-code')throw Error('Unsupported finale variant.');
  return stage;
}

// Digits and choice positions vary without changing which fictional record or
// action is correct. The story-frame contract continues to name that same item.
export function varyPuzzleResults(stage,seed){
  const result=structuredClone(stage),number=result.number;
  if(number<5){
    const offset=stablePuzzleSeed(`${seed}:${number}:digits`)%3;
    const digit=value=>String((Number(value)-1+offset)%3+1);
    result.options=result.options.map(value=>value.replace(/ \/ digit ([1-3])$/,(_,n)=>` / digit ${digit(n)}`));
    result.material.items=result.material.items.map(item=>({...item,detail:item.detail.replace(/((?:Result digit|Digit): )([1-3])\./g,(_,prefix,n)=>`${prefix}${digit(n)}.`)}));
    const saved=digit(result.material.logic.resultDigit);result.material.logic.resultDigit=saved;
    result.unlock=result.unlock.replace(/Keep result digit [1-3]/,`Keep result digit ${saved}`);
  }
  const shift=stablePuzzleSeed(`${seed}:${number}:choices`)%3;
  result.options=rotate(result.options,shift);result.answerIndex=(result.answerIndex-shift+3)%3;
  result.question=result.task;result.evidence=result.clue;
  return result;
}


export function selectCheckedVariant(classic,context,check){
  const fallback=check(classic,'classic');
  try{return check(puzzleVariantStage(classic,context),context.variant);}
  catch{return fallback;}
}
