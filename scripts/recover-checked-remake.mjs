import {readFileSync,writeFileSync} from 'node:fs';
import {createHash,randomUUID} from 'node:crypto';
import {generateBlueprint,repairBlueprint,generateStagedCheckpoint,assembleStagedStory,auditStagedStory} from '../backend/staged-story.mjs';
import {controlledMaterialTypes} from '../backend/controlled-puzzles.mjs';
import {validatePlan} from '../shared/creator-plan.mjs';
import {buildGamePdf} from '../backend/pdf.mjs';

const input=JSON.parse(readFileSync(process.argv[2],'utf8'));
const rows=(Array.isArray(input)?input:[input]).flatMap(item=>item.results||[]);
if(rows.length!==1)throw Error('Exactly one existing paid remake is required.');
const row=rows[0],spec=JSON.parse(row.spec_json);
if(row.status!=='failed'||row.phase!=='blueprint'||spec.packLogicVersion!==1||row.blueprint_json)throw Error('This recovery only accepts a stopped checked blueprint.');
validatePlan(spec.plan,spec);controlledMaterialTypes(spec.plan);
const env={AI_PROVIDER:'deepseek',DEEPSEEK_API_KEY:process.env.DEEPSEEK_API_KEY,DEEPSEEK_MODEL:process.env.DEEPSEEK_MODEL||'deepseek-flash'};
if(!env.DEEPSEEK_API_KEY)throw Error('A configured provider key is required.');
const sha=value=>createHash('sha256').update(value).digest('hex');
const quote=value=>value==null?'NULL':typeof value==='number'?String(value):"'"+String(value).replaceAll("'","''")+"'";
const generationRound=Math.min(row.recovery_round+1,2)+1;
const attempts=[];
let result,candidate,reason;
for(let index=0;index<2&&!result;index++){
  try {result=index===0?await generateBlueprint(spec,env):await repairBlueprint(spec,candidate,reason,env);attempts.push({result:result.blueprint,usage:result.usage,responseId:result.responseId,status:'passed'});}
  catch(error){candidate=error.candidate;reason=String(error.message);attempts.push({result:candidate,usage:error.usage,responseId:error.responseId,status:'failed',code:error.code,reason});if(!candidate)break;}
}
const calls=attempts.map(item=>`INSERT INTO custom_pack_remake_calls (id,order_id,phase,stage_number,status,model,result_json,response_id,input_tokens,output_tokens,error_code,error_detail,round_number,generation_round,logic_epoch,completed_at) VALUES (${[randomUUID(),row.order_id,'blueprint',0,item.status,env.DEEPSEEK_MODEL,item.result?JSON.stringify(item.result):null,item.responseId,item.usage?.input_tokens??null,item.usage?.output_tokens??null,item.code??null,item.reason??null,Math.min(generationRound,2),generationRound,row.logic_epoch].map(quote).join(',')},CURRENT_TIMESTAMP);`).join('\n');
writeFileSync(process.argv[3],calls+'\n');
if(!result){console.log(JSON.stringify({providerCalls:attempts.length,result:'stopped_before_recovery'}));throw Error('Real provider blueprint validation failed; prior PDFs and order were not changed.');}
const blueprint=result.blueprint,stages=[];
for(let number=1;number<=5;number++)stages.push((await generateStagedCheckpoint(spec,blueprint,number,stages.at(-1),env,()=>{throw Error('Checked stages cannot call a provider');})).stage);
const story=assembleStagedStory(spec,blueprint,stages);
await auditStagedStory(story,spec,blueprint,env,()=>{throw Error('Checked audit cannot call a provider');});
for(const [role,pages] of [['player',12],['guide',7]]){
  const pdf=buildGamePdf(story,spec,role),text=new TextDecoder().decode(pdf);
  if(!text.startsWith('%PDF-')||!text.includes(`/Count ${pages}`)||pdf.length<1000)throw Error('Complete PDF validation failed.');
}
const blueprintJson=JSON.stringify(blueprint);
const update=`UPDATE custom_pack_remakes SET blueprint_json=${quote(blueprintJson)},blueprint_sha256=${quote(sha(blueprintJson))},status='queued',phase='checkpoint',recovery_round=${generationRound-1},lease_until=NULL,failure_count=0,error_code=NULL,error_detail=NULL,completed_at=NULL,updated_at=CURRENT_TIMESTAMP WHERE order_id=${quote(row.order_id)} AND status='failed' AND phase='blueprint' AND logic_epoch=${row.logic_epoch} AND recovery_round=${row.recovery_round} AND spec_sha256=${quote(row.spec_sha256)} AND blueprint_json IS NULL;`;
writeFileSync(process.argv[4],update+'\n');
console.log(JSON.stringify({providerCalls:attempts.length,blueprint:'valid',checkpoints:stages.length,paperTypes:blueprint.stages.map(stage=>stage.material.type),playerPages:12,guidePages:7,recovery:'prepared_on_same_order'}));
