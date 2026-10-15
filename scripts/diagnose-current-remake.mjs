import {readFileSync} from 'node:fs';
import {generateBlueprint} from '../backend/staged-story.mjs';

const payload=JSON.parse(readFileSync(process.argv[2],'utf8'));
const rows=(Array.isArray(payload)?payload:[payload]).flatMap(item=>item.results||[]);
function rule(value){
  const message=String(value||'');
  const checkpoint=Number(message.match(/Checkpoint\s+([1-5])/i)?.[1])||null;
  const patterns=[
    [/mission outcome|completed mission/i,'EARLY_OUTCOME'],
    [/story-specific labels|named paper pieces|placeholder/i,'LABELS'],
    [/witness candidates/i,'WITNESS_LABELS'],
    [/worksheet/i,'WORKSHEET_LABELS'],
    [/feature names|story properties|puzzle-state labels/i,'FEATURES'],
    [/printed word|ASCII letters|code choices/i,'CODE_WORD'],
    [/already learned|later investigation|promises another investigation/i,'PENDING_DISCOVERY'],
    [/story consequence|explain why|supports the final action|state both the checked finding/i,'CAUSAL_LINK'],
    [/three discoveries|directly name part/i,'FINAL_ACTION_SUPPORT'],
    [/ending|celebration|complete sentence|two complete beats/i,'ENDING'],
    [/distinct variations|repeat the same puzzle/i,'REPETITION'],
    [/five-checkpoint|blueprint|approved plan/i,'STRUCTURE'],
    [/concise printable English|missing or too long/i,'TEXT_LIMIT'],
    [/provider|upstream|unreadable/i,'PROVIDER'],
  ];
  return {category:patterns.find(([pattern])=>pattern.test(message))?.[1]||'OTHER',checkpoint};
}
for(const row of rows){
  const spec=JSON.parse(row.spec_json),candidate=row.result_json?JSON.parse(row.result_json):null;
  const goalTerms=new Set(String(spec.plan.goal||'').toLowerCase().match(/[a-z]{4,}/g)?.filter(word=>!['find','with','that','from','their','they','then','will','into','before','after','again','help','make','complete','finish','restore','repair','rescue','return','deliver','missing','story','journey'].includes(word))||[]);
  const matchedVerbs=candidate?.stages?.slice(0,4).map(stage=>[...new Set((stage.material?.items||[]).flatMap(piece=>{
    const label=String(typeof piece==='string'?piece:piece.label||'').toLowerCase();
    if(![...goalTerms].some(term=>new RegExp(`\\b${term}\\b`).test(label)))return [];
    return label.match(/\b(?:hear|heard|ring|rings|rang|sound|sounds|sounded|restore|restored|repair|repaired|rescue|rescued|saved|delivered|returned|completed|finished|won|recovered|solved)\b/g)||[];
  }))])||null;
  const report={status:row.status,phase:row.phase,round:row.recovery_round,epoch:row.logic_epoch,
    packExperienceVersion:spec.packExperienceVersion||0,packQualityVersion:spec.packQualityVersion||0,packLayoutVersion:spec.packLayoutVersion||0,remakeCode:row.remake_error_code,
    remakeRule:rule(row.remake_error_detail),callStatus:row.call_status,callCode:row.call_error_code,
    callRule:rule(row.call_error_detail),candidate:candidate?{stages:candidate.stages?.length,
      pieces:candidate.stages?.map(stage=>stage.material?.items?.length||0),
      featureCounts:candidate.stages?.map(stage=>stage.features?.length||0),
      wordLengths:candidate.stages?.map(stage=>stage.word?.length||0),matchedOutcomeVerbs:matchedVerbs}:null};
  if(candidate){
    try{await generateBlueprint(spec,{OPENAI_API_KEY:'diagnostic-fixture',OPENAI_MODEL:'fixture'},async()=>Response.json({output:[{content:[{type:'output_text',text:JSON.stringify(candidate)}]}]}));report.replay='PASS';}
    catch(error){report.replay=rule(error.message);}
  }
  console.log(JSON.stringify(report));
}
