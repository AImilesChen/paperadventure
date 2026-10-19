import {sentenceEnds} from './plan-format.mjs';
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

// A proposed action such as "repair the clock" is not an accomplished outcome.
const earlyOutcome=/\b(?:restored|repaired|rescued|saved|delivered|returned|completed|finished|won|recovered|solved)\b/i;
// Perception cannot finish a mission. These verbs only count as an outcome when
// their own object is the goal ("Heard the noon bell"), never when they report a
// background event ("the bellhop heard a strange message before the key vanished").
const perceivedOutcome=/\b(?:heard|rings|rang|sounds|sounded)\b((?:\s+[A-Za-z'-]+){0,2})/gi;
const goalWords=goal=>new Set(String(goal||'').toLowerCase().match(/[a-z]{4,}/g)?.filter(word=>!['find','with','that','from','their','they','then','will','into','before','after','again','help','make','complete','finish','restore','repair','rescue','return','deliver','missing','story','journey'].includes(word))||[]);
export function assertGoalStillOpen(texts,goal,number){
  const terms=goalWords(goal);
  const names=term=>new RegExp(`\\b${term}\\b`,'i');
  const finished=value=>{
    if(earlyOutcome.test(value)&&[...terms].some(term=>names(term).test(value)))return true;
    for(const match of String(value).matchAll(perceivedOutcome))
      if([...terms].some(term=>names(term).test(match[1])))return true;
    return false;
  };
  for(const value of texts){
    if(finished(value))
      throw Error(`Checkpoint ${number} names a completed mission outcome before the final action.`);
  }
}

export function paperAction(type,number){
  if(number===5)return paperActions.finale;
  if(type==='order_tiles')return [
    {title:'Arrange the linked repair steps',task:'Arrange the four printed steps using every before-and-after link. Record the matching order and result digit.'},
    {title:'Arrange first, last and neighbours',task:'Arrange the four printed steps using the first, last and neighbouring-step rules. Record the matching order and result digit.'},
    {title:'Arrange the earlier and later steps',task:'Arrange the four printed steps using every earlier/later rule. Record the matching order and result digit.'},
  ][number%3];
  if(type==='symbol_key')return {title:`Decode printed message ${number}`,task:`Decode printed message ${number} with its complete four-row key. Record the decoded word and its result digit.`};
  return paperActions[type];
}

function paperOpening(premise){
  if(typeof premise!=='string'||!premise.trim()||premise.length>200||!sentenceEnds(premise))throw Error('The fictional premise needs complete sentences under 200 characters.');
  return `${premise.trim()} Complete four printed checks to collect four result digits. Their combined code identifies the final action that completes this mission.`;
}

export function paperPlanMechanics(gameplay={},qualityVersion=14){
  const primary=gameplay.primary||'reasoning';
  const support=gameplay.secondary||[];
  if(qualityVersion>=15){
    const other=[...new Set(support.filter(mechanic=>mechanic!==primary))];
    // The finale remains the selected main style; the playable checks vary.
    return [primary,primary,other[0]||'reasoning',other[1]||'reasoning',primary];
  }
  return [primary,primary,primary,support[0]||'reasoning',support[1]||'reasoning'];
}

export function completePaperPlan(candidate,gameplay,qualityVersion=14){
  if(candidate?.stages?.length!==5)throw Error('Five planned checkpoints are required.');
  for(let index=0;index<4;index++)assertGoalStillOpen([candidate.stages[index]?.scene||'',candidate.stages[index]?.storyBeat||''],candidate.goal,index+1);
  const mechanics=paperPlanMechanics(gameplay,qualityVersion);
  const types=paperContractTypes({stages:mechanics.map(mechanic=>({mechanic}))});
  return alignPaperPlan({...candidate,...(candidate.premise?{opening:paperOpening(candidate.premise)}:{}),id:['mystery','mission'].includes(candidate.id)?candidate.id:'mission',stages:candidate.stages.map((stage,index)=>({...stage,
    number:index+1,mechanic:mechanics[index],scene:stage.scene||`At printed checkpoint ${index+1}`,storyContext:stage.storyBeat?`${stage.scene.trim().replace(/[.!?]+$/,'')}. ${stage.storyBeat.trim()}`:paperStoryMoment(stage.scene||`At printed checkpoint ${index+1}`,types[index],index+1)}))});
}

export function paperStoryMoment(scene,type,number){
  if(typeof scene!=='string'||!scene.trim()||scene.length>80)throw Error('Each fictional location must be a short phrase under 80 characters.');
  const operation=number===5?'Combine the four saved digits in order. Only one printed final action matches this code and completes the mission.':{
    evidence_cards:'Three report cards offer two facts each. Match both printed conditions and save the chosen result digit.',
    decision_record:"Two witness notes rule out two of three candidates. Save the remaining candidate's digit for the final code.",
    order_tiles:number%3===1?'Arrange four printed steps using first, last and neighbouring-step rules. Save the matching result digit.':number%3===2?'Arrange four printed steps using the earlier/later rules. Save the matching result digit.':'Arrange four printed steps using the before-and-after links. Save the matching result digit.',
    symbol_key:'Use the four-row key to decode a four-letter word. Find its matching choice and save the result digit.',
    route_board:'Three paper routes show two conditions each. Choose the route meeting both conditions and save its digit.',
  }[type];
  return `${scene.trim().replace(/[.!?]+$/,'')}. ${operation}`;
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
    const action=paperAction(types[index],index+1);
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
