import {shapeSymbols} from '../shared/puzzle-variants.mjs';
// Independent checks read printed facts and choices, never rebuild the puzzle.
const permutations=values=>values.length?values.flatMap((value,index)=>permutations(values.filter((_,i)=>i!==index)).map(rest=>[value,...rest])):[[]];
const choiceText=value=>value.replace(/ \/ digit [1-3]$/,'');
const digitInChoice=value=>value.match(/ \/ digit ([1-3])$/)?.[1];

function orderFits(order,items){
  const position=label=>order.indexOf(label),labels=items.map(item=>item.label);
  return items.every(item=>item.detail.replace(/\.$/,'').split('; ').every(rule=>{
    const pos=position(item.label);
    if(rule==='This step is first')return pos===0;
    if(rule==='This step is last'||rule==='After every other step')return pos===3;
    for(const target of labels){
      if(rule===`Before ${target}`||rule===`before ${target}`)return pos<position(target);
      if(rule===`After ${target}`||rule===`after ${target}`)return pos>position(target);
      if(rule===`Immediately after ${target}`)return pos===position(target)+1;
      if(rule===`Immediately before ${target}`)return pos===position(target)-1;
      for(const other of labels)if(rule===`Before ${target} and ${other}`)return pos<position(target)&&pos<position(other);
    }
    throw Error('A printed ordering rule could not be checked.');
  }));
}

export function verifyPrintedPuzzle(stage,previousDigits=[]){
  const digits=[...previousDigits];
    const items=stage.material.items,type=stage.material.type;
    let expected,digit;
    if(stage.number===5){
      const code=digits.join('');
      const matches=items.slice(0,3).filter(item=>item.detail===`Final action code: ${code}`);
      if(matches.length!==1)throw Error('The final printed record does not have one matching action.');
      expected=`${matches[0].label} / ${code}`;
    }else if(type==='evidence_cards'&&items.some(item=>item.label==='Cross-check register')){
      if(items.length!==5||items[4].detail!=='Match record numbers with the register. Both required facts must be YES.')throw Error('The cross-check rule is missing.');
      const register=items[3];
      if(register.label!=='Cross-check register')throw Error('The cross-check register is missing.');
      const entries=[...register.detail.matchAll(/Record ([1-3]): (YES|NO)\./g)];
      if(entries.length!==3||new Set(entries.map(entry=>entry[1])).size!==3)throw Error('The register needs three unique records.');
      const heading=register.detail.split('. Record ')[0];let firstFeature;
      const matches=items.slice(0,3).filter((item,index)=>{
        const fact=item.detail.match(/^Record ([1-3])\. (.+): (YES|NO)\. Digit: ([1-3])\.$/);
        if(!fact||Number(fact[1])!==index+1)throw Error('A cross-check record is incomplete.');
        if(firstFeature&&firstFeature!==fact[2]||heading===fact[2])throw Error('Cross-check properties must be consistent and distinct.');firstFeature=fact[2];
        return fact[3]==='YES'&&entries.find(entry=>entry[1]===fact[1])[2]==='YES';
      });
      if(matches.length!==1)throw Error('Cross-check facts must leave one record.');
      expected=matches[0].label;digit=matches[0].detail.match(/Digit: ([1-3])\.$/)[1];
    }else if(type==='route_board'&&items[3]?.detail.startsWith('Choose a route with YES for both ')){
      let required;
      const matches=items.slice(0,3).filter(item=>{
        const facts=item.detail.match(/^(.+): (YES|NO)\. (.+): (YES|NO)\. Digit: ([1-3])\.$/);
        if(!facts)throw Error('A route condition is missing.');
        const rule=`Choose a route with YES for both ${facts[1]} and ${facts[3]}.`;
        if(facts[1]===facts[3]||items[3].detail!==rule||required&&required!==rule)throw Error('Route properties do not match the printed rule.');required=rule;
        return facts[2]==='YES'&&facts[4]==='YES';
      });
      if(matches.length!==1)throw Error('Route conditions must leave one candidate.');
      expected=matches[0].label;digit=matches[0].detail.match(/Digit: ([1-3])\.$/)?.[1];
    }else if(type==='route_board'&&stage.material.logic?.experienceVersion>=2){
      if(items.length!==4||items[3].label!=='Route rule'||!items[3].detail.includes('Both links must be OPEN'))throw Error('The printed route rule is missing.');
      const matches=items.slice(0,3).filter(item=>{
        const match=item.detail.match(/^START > .+ > END\. First link: (OPEN|CLOSED)\. Second link: (OPEN|CLOSED)\. Digit: ([1-3])\.$/);
        if(!match)throw Error('A route is missing a printed link or result digit.');
        return match[1]==='OPEN'&&match[2]==='OPEN';
      });
      if(matches.length!==1)throw Error('Printed route links must leave exactly one continuous path.');
      expected=matches[0].label;digit=matches[0].detail.match(/Digit: ([1-3])\.$/)?.[1];
    }else if(type==='evidence_cards'||type==='route_board'){
      const rule=items[3];
      if(!rule||!/^Choose a (piece|route) with YES for both /.test(rule.detail))throw Error('A separate printed comparison rule is required.');
      const matches=items.slice(0,3).filter(item=>{
        const facts=[...item.detail.matchAll(/: (YES|NO)\./g)].map(match=>match[1]);
        return facts.length===2&&facts.every(value=>value==='YES');
      });
      if(matches.length!==1)throw Error('Printed comparison facts must identify one candidate.');
      expected=matches[0].label;digit=matches[0].detail.match(/Digit: ([1-3])\./)?.[1];
    }else if(type==='decision_record'&&items.slice(3).every(item=>item.detail.startsWith('This report rules out '))){
      const candidates=items.slice(0,3),witnesses=items.slice(3);
      if(witnesses.length!==2)throw Error('Both role clues are required.');
      const excluded=witnesses.map(witness=>{
        const matches=candidates.filter(item=>witness.detail===`This report rules out ${item.label}.`);
        if(matches.length!==1)throw Error('A role clue must name one candidate.');return matches[0].label;
      });
      if(new Set(excluded).size!==2)throw Error('The role clues must exclude different candidates.');
      const matches=candidates.filter(item=>!excluded.includes(item.label));
      if(matches.length!==1)throw Error('Both role clues must leave one candidate.');
      expected=matches[0].label;digit=matches[0].detail.match(/Result digit: ([1-3])\.$/)?.[1];
    }else if(type==='decision_record'&&stage.material.logic?.experienceVersion>=2){
      const candidates=items.slice(0,3),witnesses=items.slice(3);
      if(candidates.length!==3||witnesses.length!==2)throw Error('The witness record is incomplete.');
      const required=witnesses.map(witness=>{
        const match=witness.detail.match(/^The right choice has (.+): YES\.$/);
        if(!match)throw Error('A witness property is missing.');
        return match[1];
      });
      if(new Set(required).size!==2)throw Error('The two witness properties must differ.');
      const matches=candidates.filter(item=>required.every(feature=>item.detail.includes(`${feature}: YES.`)));
      if(matches.length!==1)throw Error('The printed witness properties must identify one candidate.');
      expected=matches[0].label;digit=matches[0].detail.match(/Result digit: ([1-3])\.$/)?.[1];
    }else if(type==='decision_record'){
      const candidates=items.slice(0,3),witnesses=items.slice(3);
      if(witnesses.length!==2)throw Error('Two printed witness statements are required.');
      const excluded=witnesses.map(witness=>{
        const names=candidates.filter(item=>witness.detail.endsWith(`rules out ${item.label}.`));
        if(names.length!==1)throw Error('A witness must explicitly exclude one named candidate.');
        return names[0].label;
      });
      const matches=candidates.filter(item=>!excluded.includes(item.label));
      if(matches.length!==1)throw Error('The witnesses must leave one candidate.');
      expected=matches[0].label;digit=matches[0].detail.match(/Result digit: ([1-3])\./)?.[1];
    }else if(type==='order_tiles'){
      const orders=permutations(items.map(item=>item.label)).filter(order=>orderFits(order,items));
      if(orders.length!==1)throw Error('The printed ordering rules must have one solution.');
      expected=stage.options.find(option=>choiceText(option)===orders[0].join(' > '));digit=digitInChoice(expected||'');
    }else if(type==='symbol_key'){
      const key=items;
      const numeric=key.map(item=>item.label).sort().join('')==='1234';
      const shapes=shapeSymbols.every(symbol=>key.some(item=>item.label===symbol));
      if(key.length!==4||(!numeric&&!shapes)||new Set(key.map(item=>item.label)).size!==4||key.some(item=>!/^[A-Z]$/.test(item.detail)))throw Error('The four-entry printed key is incomplete.');
      const message=stage.clue?.match(/message is ([A-Z0-9]+(?:-[A-Z0-9]+){3})/i)?.[1]?.split('-')||['1','2','3','4'];
      if(new Set(message).size!==4||message.some(symbol=>!key.some(item=>item.label===symbol)))throw Error('The printed message must use each key entry once.');
      const word=message.map(symbol=>key.find(item=>item.label===symbol).detail).join('');
      expected=stage.options.find(option=>choiceText(option)===word);digit=digitInChoice(expected||'');
    }else throw Error('The printed material is unsupported.');
    const matches=stage.options.map((option,index)=>option===expected?index:-1).filter(index=>index>=0);
    if(matches.length!==1||matches[0]!==stage.answerIndex)throw Error(`Checkpoint ${stage.number} printed proof disagrees with its adult answer.`);
    if(stage.number<5){
      if(!digit||digit!==stage.material.logic.resultDigit)throw Error(`Checkpoint ${stage.number} printed result digit is inconsistent.`);
      digits.push(digit);
    }
    return {checkpoint:stage.number,materialType:type,correctChoice:matches[0]+1,resultDigit:digit||null};
}

export function verifyPrintedPuzzles(story){
  const digits=[],proofs=[];
  for(const stage of story.stages){
    const proof=verifyPrintedPuzzle(stage,digits);proofs.push(proof);
    if(stage.number<5)digits.push(proof.resultDigit);
  }
  return proofs;
}

