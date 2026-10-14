import {readFileSync} from 'node:fs';
import {generateBlueprint} from '../backend/staged-story.mjs';

const payload=JSON.parse(readFileSync(process.argv[2],'utf8'));
const rows=(Array.isArray(payload)?payload:[payload]).flatMap(item=>item.results||[]);
for(const row of rows){
  const spec=JSON.parse(row.spec_json),candidate=row.result_json?JSON.parse(row.result_json):null;
  const report={status:row.status,phase:row.phase,logicVersion:spec.packLogicVersion,epoch:row.logic_epoch,round:row.recovery_round,
    errorCode:row.error_code,callStatus:row.call_status,
    approvedMechanics:spec.plan.stages.map(stage=>stage.mechanic),
    candidate:candidate?{stageCount:candidate.stages?.length,endingLength:candidate.ending?.length,groupLength:candidate.groupInstructions?.length,
      stages:candidate.stages?.map(stage=>({type:stage.material?.type,unlockLength:stage.unlock?.length,titleLength:stage.material?.title?.length,
        pieceCount:stage.material?.items?.length,labelLengths:stage.material?.items?.map(piece=>piece.label?.length)}))}:null};
  if(candidate){
    try {await generateBlueprint(spec,{OPENAI_API_KEY:'diagnostic-fixture',OPENAI_MODEL:'fixture'},async()=>Response.json({output:[{content:[{type:'output_text',text:JSON.stringify(candidate)}]}]}));report.replay='passed';}
    catch(error){report.replay=String(error.message).slice(0,250);}
  }
  console.log(JSON.stringify(report));
}
