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

export function verifyPrintedPuzzles(story){
  const digits=[],proofs=[];
  for(const stage of story.stages){
    const items=stage.material.items,type=stage.material.type;
    let expected,digit;
    if(stage.number===5){
      const code=digits.join('');
      const matches=items.slice(0,3).filter(item=>item.detail===`Final action code: ${code}`);
      if(matches.length!==1)throw Error('The final printed record does not have one matching action.');
      expected=`${matches[0].label} / ${code}`;
    }else if(type==='evidence_cards'||type==='route_board'){
      const rule=items[3];
      if(!rule||!/^Choose a (piece|route) with YES for both /.test(rule.detail))throw Error('A separate printed comparison rule is required.');
      const matches=items.slice(0,3).filter(item=>{
        const facts=[...item.detail.matchAll(/: (YES|NO)\./g)].map(match=>match[1]);
        return facts.length===2&&facts.every(value=>value==='YES');
      });
      if(matches.length!==1)throw Error('Printed comparison facts must identify one candidate.');
      expected=matches[0].label;digit=matches[0].detail.match(/Digit: ([1-3])\./)?.[1];
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
      const key=items.slice().sort((a,b)=>Number(a.label)-Number(b.label));
      if(key.map(item=>item.label).join('')!=='1234'||key.some(item=>!/^[A-Z]$/.test(item.detail)))throw Error('The four-letter printed key is incomplete.');
      const word=key.map(item=>item.detail).join('');
      expected=stage.options.find(option=>choiceText(option)===word);digit=digitInChoice(expected||'');
    }else throw Error('The printed material is unsupported.');
    const matches=stage.options.map((option,index)=>option===expected?index:-1).filter(index=>index>=0);
    if(matches.length!==1||matches[0]!==stage.answerIndex)throw Error(`Checkpoint ${stage.number} printed proof disagrees with its adult answer.`);
    if(stage.number<5){
      if(!digit||digit!==stage.material.logic.resultDigit)throw Error(`Checkpoint ${stage.number} printed result digit is inconsistent.`);
      digits.push(digit);
    }
    proofs.push({checkpoint:stage.number,materialType:type,correctChoice:matches[0]+1,resultDigit:digit||null});
  }
  return proofs;
}
