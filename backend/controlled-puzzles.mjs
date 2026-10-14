// The model may name a scene and its paper pieces. The printable facts, choices,
// answer and player instructions below are one deterministic puzzle contract.
// This keeps an answer change from silently disagreeing with the PDF material.
const short = (value, fallback) => {
  const words = String(value || '').replace(/[^\x20-\x7e]/g, ' ').replace(/\s+/g, ' ').trim();
  return (words.length > 18 ? words.slice(0, 18).replace(/\s+\S*$/, '') : words) || fallback;
};

const labelsFor = (material, type) => {
  if (type === 'symbol_key') return ['1', '2', '3', '4'];
  const count = type === 'order_tiles' ? 4 : 3;
  const labels = [];
  for (let i = 0; i < count; i++) {
    const base = short(material.items?.[i]?.label, `Piece ${i + 1}`);
    labels.push(labels.some(label => label.toLowerCase() === base.toLowerCase()) ? `${base.slice(0, 14)} ${i + 1}` : base);
  }
  return labels;
};

const uniqueAnswer = (choices, accepts) => {
  const matches=choices.flatMap((choice,index)=>accepts(choice)?[index]:[]);
  if(matches.length!==1) throw new Error('The paper puzzle does not have exactly one provable answer.');
  return matches[0];
};

export function controlledMaterialTypes(plan) {
  const allowed={reasoning:['evidence_cards','route_board','decision_record'],discussion:['decision_record','evidence_cards'],sequence:['order_tiles'],code:['symbol_key']};
  if(!plan || plan.stages?.length!==5 || plan.stages.some(stage=>!allowed[stage.mechanic])) throw new Error('A supported five-checkpoint plan is required.');
  let best=null,bestScore=-Infinity;
  function visit(types){
    if(types.length===5){
      const kinds=new Set(types);
      if(kinds.size<3 || !kinds.has('evidence_cards') || !types.some(type=>type==='route_board'||type==='order_tiles'))return;
      const score=kinds.size*10-types.filter((type,index)=>index>0&&types[index-1]===type).length;
      if(score>bestScore){bestScore=score;best=types;}
      return;
    }
    for(const type of allowed[plan.stages[types.length].mechanic])visit([...types,type]);
  }
  visit([]);
  if(!best)throw new Error('The approved mechanics cannot support three paper activity types, including evidence and a route or ordering task.');
  return best;
}

function puzzle(type, labels) {
  const [a, b, c, d] = labels;
  switch (type) {
    case 'evidence_cards': return {
      instruction: `Compare the marks and seals on ${a}, ${b} and ${c}. Use the separate rule slip.`,
      items: [
        {label:a,detail:'Blue mark; round seal.'},
        {label:b,detail:'Blue mark; star seal.'},
        {label:c,detail:'Red mark; star seal.'},
        {label:'Rule slip',detail:`Keep the mark colour from ${a} and the seal shape from ${c}. Which card has both?`},
      ],
      question:'Which card combines the two features on the rule slip?',
      options:[a,b,c], answerIndex:uniqueAnswer([[1,0],[1,1],[0,1]],([blue,star])=>blue===1&&star===1),
      clue:'Read the rule slip, then compare the colour and seal on all three cards. Record the one card that matches both features.',
      hint:'Find the colour on the first named card and the seal on the other named card.',
      explanation:`${a} supplies blue; ${c} supplies the star seal. Only ${b} has both blue and a star seal.`,
    };
    case 'order_tiles': return {
      instruction:'Number the four tiles in a sequence that follows every printed before-and-after rule. Cutting is optional.',
      items:[
        {label:a,detail:`This happens before ${b}.`},
        {label:b,detail:`This happens after ${a} but before ${c}.`},
        {label:c,detail:`This happens after ${b} but before ${d}.`},
        {label:d,detail:`This happens after ${c}.`},
      ],
      question:'Which order obeys every printed tile?',
      options:[[a,c,b,d],[a,b,c,d],[b,a,d,c]].map(parts=>parts.join(' > ')),
      answerIndex:uniqueAnswer([[a,c,b,d],[a,b,c,d],[b,a,d,c]],parts=>[a,b,c].every((label,index)=>parts.indexOf(label)<parts.indexOf([b,c,d][index]))),
      clue:'Point to or number each tile. Compare every before-and-after rule before selecting a complete order.',
      hint:'Start with the tile that must come before the second tile; then check the two middle rules.',
      explanation:`The rules require ${a} before ${b}, ${b} before ${c}, and ${c} before ${d}. The matching sequence keeps all three relationships.`,
    };
    case 'symbol_key': return {
      instruction:'Use all four printed key rows to decode the signal 1-2-3-4. Write one letter for each number.',
      items:[{label:'1',detail:'N'},{label:'2',detail:'E'},{label:'3',detail:'X'},{label:'4',detail:'T'}],
      question:'What does the signal 1-2-3-4 say?',
      options:['NETX','NEXT','XENT'],answerIndex:uniqueAnswer(['NETX','NEXT','XENT'],word=>word==='NEXT'),
      clue:'The signal is 1-2-3-4. Look up each number on the separate key sheet, keeping the printed order.',
      hint:'Write one letter below each number before reading the whole word.',
      explanation:'The key maps 1 to N, 2 to E, 3 to X and 4 to T, so the ordered signal spells NEXT.',
    };
    case 'route_board': return {
      instruction:'Trace each route row from START to END. Compare both its crossing and its ground.',
      items:[
        {label:a,detail:'Bridge crossing; sharp rocks on the ground.'},
        {label:b,detail:'Bridge crossing; clear ground with no rocks.'},
        {label:c,detail:'No bridge crossing; clear ground with no rocks.'},
      ],
      question:'Which route has a bridge and no sharp rocks?',
      options:[a,b,c],answerIndex:uniqueAnswer([[1,0],[1,1],[0,1]],([bridge,clear])=>bridge===1&&clear===1),
      clue:'The team needs both a bridge crossing and ground without sharp rocks. Check both features on every route row.',
      hint:'A route with only one of the two required features is not enough.',
      explanation:`${a} has rocks and ${c} has no bridge. Only ${b} has a bridge and clear ground.`,
    };
    case 'decision_record': return {
      instruction:'Check the two features on each proposal against the separate decision rule. Mark one proposal and explain why.',
      items:[
        {label:a,detail:'The signal is ready; the route still has rocks.'},
        {label:b,detail:'The signal is ready; the route is clear.'},
        {label:c,detail:'The signal is not ready; the route is clear.'},
        {label:'Decision rule',detail:'Choose only a proposal with a ready signal AND a clear route.'},
      ],
      question:'Which proposal satisfies both parts of the decision rule?',
      options:[a,b,c],answerIndex:uniqueAnswer([[1,0],[1,1],[0,1]],([ready,clear])=>ready===1&&clear===1),
      clue:'Read the decision rule and test both parts against each proposal. Mark the proposal that passes both.',
      hint:'Cross out proposals that fail either part of the rule.',
      explanation:`${a} has rocks and ${c} has no ready signal. Only ${b} satisfies both requirements.`,
    };
    default: throw new Error('Unsupported controlled paper activity.');
  }
}

export function compileControlledPuzzle(stage) {
  const type=stage.material?.type;
  const labels=labelsFor(stage.material || {},type);
  const built=puzzle(type,labels);
  const optionShift=Number.isInteger(stage.number)?stage.number%3:stage.material?.logic?.optionShift??0;
  const options=built.options.map((_,index)=>built.options[(index+optionShift)%3]);
  const material={type,title:String(stage.material.title||stage.title||'Paper puzzle').trim().slice(0,60),instruction:built.instruction,
    recordPrompt:'Write your result and one printed reason below.',items:built.items,
    logic:{version:1,labels,optionShift}};
  return {...stage,question:built.question,evidence:built.clue,options,answerIndex:(built.answerIndex-optionShift+3)%3,material};
}

export function controlledStageText(stage,style=stage.logicStyle||'base') {
  const {clue,hint,explanation}=puzzle(stage.material.type,stage.material.logic.labels);
  if (!['base','simple','guided','clear'].includes(style)) throw new Error('Unknown checked checkpoint wording.');
  if (style==='simple') return {clue:`Read the printed rule. Check one piece at a time. ${clue}`,explanation,hint:'Read the rule aloud, then check each printed piece.'};
  if (style==='guided') return {clue,explanation,hint:`${hint} Check both parts before choosing.`.slice(0,120)};
  if (style==='clear') return {clue:`Step 1: read the paper rule. Step 2: compare every printed piece. Step 3: record one answer and a reason. ${clue}`,explanation,hint};
  return {clue,explanation,hint};
}

export function controlledRevisionStyle(instruction) {
  const value=String(instruction||'').toLowerCase();
  if (/read|simpl|short|younger/.test(value)) return 'simple';
  if (/difficult|eas|hint|help/.test(value)) return 'guided';
  if (/clar|step|instruction|explain/.test(value)) return 'clear';
  return null;
}

export function validateControlledPuzzle(stage, {withText=false}={}) {
  const logic=stage.material?.logic;
  if (logic?.version!==1 || !Number.isInteger(logic.optionShift) || logic.optionShift<0 || logic.optionShift>2 ||
      Number.isInteger(stage.number)&&logic.optionShift!==stage.number%3 ||
      !Array.isArray(logic.labels) || logic.labels.length!==(stage.material.type==='order_tiles'||stage.material.type==='symbol_key'?4:3) ||
      logic.labels.some(label=>typeof label!=='string'||!label||label.length>18||/[^\x20-\x7e]/.test(label)) ||
      new Set(logic.labels.map(label=>label.toLowerCase())).size!==logic.labels.length)
    throw new Error('The paper puzzle contract is missing or invalid.');
  const expected=compileControlledPuzzle({...stage,material:{...stage.material,items:logic.labels.map(label=>({label,detail:'seed'}))}});
  const fields=withText?['options','answerIndex','material']:['question','evidence','options','answerIndex','material'];
  for (const field of fields) if (JSON.stringify(stage[field])!==JSON.stringify(expected[field]))
    throw new Error(`The paper puzzle ${field} differs from its checked rules.`);
  if (withText) {
    const text=controlledStageText(stage);
    for (const field of ['clue','explanation','hint']) if(stage[field]!==text[field])
      throw new Error(`The checkpoint ${field} differs from its checked paper puzzle.`);
  }
  return stage;
}
