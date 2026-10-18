// The reviewer must account for the actual player-visible evidence. Answer
// indices are used here only to select the mechanically proved material; they
// never become evidence in the model's causal explanation.
const clean=value=>String(value||'').replace(/\s+/g,' ').trim();

export function causalEvidenceUnits(story){
  return story.stages.slice(0,4).flatMap((stage,index)=>{
    const items=stage.material?.items||[];
    const answer=stage.options?.[stage.answerIndex];
    const selected=items.find(item=>item.label===answer);
    const units=[{id:`checkpoint_${index+1}_scene`,stageNumber:index+1,kind:'scene',text:clean(stage.storyContext)}];
    if(stage.material?.type==='order_tiles'){
      items.slice(0,4).forEach((item,position)=>units.push({id:`checkpoint_${index+1}_tile_${position+1}`,stageNumber:index+1,kind:'sequence',text:clean(`${item.label}. ${item.detail}`)}));
    }else if(stage.material?.type==='symbol_key'){
      units.push({id:`checkpoint_${index+1}_key`,stageNumber:index+1,kind:'key',text:clean(`${stage.material.instruction} ${items.map(item=>`${item.label}: ${item.detail}`).join(' ')}`)});
    }else if(selected){
      const kind=stage.material?.type==='route_board'?'route':stage.material?.type==='evidence_cards'||stage.material?.type==='decision_record'?'record':'material';
      units.push({id:`checkpoint_${index+1}_selected`,stageNumber:index+1,kind,text:clean(`${selected.label}. ${selected.detail}`)});
    }
    return units.filter(unit=>unit.text);
  });
}

export function validateCausalReview(audit,story){
  if(audit?.pass!==true)return audit;
  const proof=audit.causalProof,units=causalEvidenceUnits(story);
  const fail=()=>{throw Object.assign(Error('The causal review did not verify the player evidence.'),{code:'DELIVERY_COPY_AUDIT_PROTOCOL'});};
  if(!proof||!Array.isArray(proof.discoveries)||proof.discoveries.length!==4||!proof.problemToAction)fail();
  const used=new Set();
  const check=(entry,stageNumber)=>{
    const unit=units.find(item=>item.id===entry?.evidenceId&&(!stageNumber||item.stageNumber===stageNumber));
    if(!unit||!entry.quote||!unit.text.includes(clean(entry.quote))||clean(entry.explanation).length<20)fail();
    return unit;
  };
  check(proof.problemToAction);
  for(let index=0;index<4;index++){
    const entry=proof.discoveries[index],unit=check(entry,index+1);
    if(entry.stageNumber!==index+1||used.has(unit.id)||clean(entry.supportsAction).length<8)fail();
    used.add(unit.id);
  }
  const orderStages=story.stages.slice(0,4).filter(stage=>stage.material?.type==='order_tiles').map(stage=>stage.number);
  if(!Array.isArray(proof.chronology)||proof.chronology.length!==orderStages.length)fail();
  for(const [index,number] of orderStages.entries()){
    const entry=proof.chronology[index];
    if(entry?.stageNumber!==number||entry.consistent!==true||clean(entry.explanation).length<20)fail();
  }
  return audit;
}
