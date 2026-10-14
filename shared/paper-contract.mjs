// Shared by plan review and generation: the action a purchaser approves is the
// action that the material renderer will actually print.
export const paperActions={
  evidence_cards:{title:'Compare the printed evidence',task:'Compare the printed facts and rule. Choose one matching piece and record its result digit.'},
  decision_record:{title:'Check the witness statements',task:'Use the witness statements to eliminate two candidates. Record the remaining candidate and its result digit.'},
  order_tiles:{title:'Put the story steps in order',task:'Arrange the four printed steps using every before-and-after rule. Record the matching order and result digit.'},
  symbol_key:{title:'Decode the printed message',task:'Use the complete printed key to decode the message. Record the decoded word and its result digit.'},
  route_board:{title:'Trace a route that fits',task:'Check the printed route conditions. Choose the route that meets both requirements and record its result digit.'},
  finale:{title:'Combine the four discoveries',task:'Copy your result digits from checkpoints 1-4 in order. Compare this code with the three final actions and choose the matching action.'},
};

export function paperPlanMechanics(gameplay={}){
  const primary=gameplay.primary||'reasoning';
  const support=gameplay.secondary||[];
  return [primary,primary,primary,support[0]||'reasoning',support[1]||'reasoning'];
}

export function completePaperPlan(candidate,gameplay){
  if(candidate?.stages?.length!==5)throw Error('Five planned checkpoints are required.');
  const mechanics=paperPlanMechanics(gameplay);
  return alignPaperPlan({...candidate,id:['mystery','mission'].includes(candidate.id)?candidate.id:'mission',stages:candidate.stages.map((stage,index)=>({...stage,
    number:index+1,mechanic:mechanics[index],storyContext:stage.storyContext||stage.title}))});
}

export function paperContractTypes(plan){
  if(plan?.stages?.length!==5)throw Error('Five planned checkpoints are required.');
  const allowed={reasoning:['evidence_cards','order_tiles','route_board','decision_record'],discussion:['decision_record','evidence_cards'],sequence:['order_tiles'],code:['symbol_key']};
  let best,bestScore=-Infinity;
  function visit(types){
    if(types.length===4){
      const all=[...types,'decision_record'],kinds=new Set(all);
      if(kinds.size<3)return;
      const score=kinds.size*20-types.filter((type,i)=>i&&types[i-1]===type).length*3;
      if(score>bestScore){bestScore=score;best=all;}return;
    }
    const choices=allowed[plan.stages[types.length].mechanic];
    if(!choices)throw Error('A supported paper mechanic is required.');
    for(const type of choices)visit([...types,type]);
  }
  visit([]);
  if(!best)throw Error('The first four checkpoints need varied paper actions before the final combined record.');
  return best;
}

export function alignPaperPlan(plan){
  const types=paperContractTypes(plan);
  const stages=plan.stages.map((stage,index)=>{
    const action=paperActions[index===4?'finale':types[index]];
    return {...stage,storyContext:stage.storyContext||stage.title,title:action.title,task:action.task,
      teamwork:index===4?'Each explorer checks one earlier result. Compare all four before agreeing on the final action.':'One explorer reads, one handles the pieces, one checks the rule, and one records. Rotate these jobs after this checkpoint.',
      connection:index===4?'The four recorded discoveries identify the final action.':`Save this result digit for checkpoint 5, then continue to checkpoint ${index+2}.`};
  });
  return {...plan,roles:'Reader, Paper Handler, Checker and Recorder rotate after each checkpoint. For two players, combine jobs in pairs.',
    preparation:'Print the Player Pack. Keep the adult guide and ending private. Hand out one challenge and its material at a time. Use pencils; cutting is optional.',stages};
}

export function validatePaperPlan(plan){
  const expected=alignPaperPlan(plan);
  for(const [index,stage] of plan.stages.entries())for(const key of ['title','task','teamwork','connection'])
    if(stage[key]!==expected.stages[index][key])throw Error(`Checkpoint ${index+1} ${key} does not match its printable action.`);
  if(!/[.!?]$/.test(plan.opening.trim()))throw Error('The opening must end with a complete sentence.');
  return plan;
}
