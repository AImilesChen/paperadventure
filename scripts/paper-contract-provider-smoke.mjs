import {mkdir,writeFile} from 'node:fs/promises';
import {validatePurchase} from '../backend/domain.mjs';
import {generateSinglePlan} from '../backend/plan-proposals.mjs';
import {generateBlueprint,repairBlueprint,generateStagedCheckpoint,assembleStagedStory,auditStagedStory,auditCheckpointSemantics} from '../backend/staged-story.mjs';
import {buildGamePdf} from '../backend/pdf.mjs';
import {verifyPrintedPuzzles} from '../backend/paper-proof.mjs';

const env={AI_PROVIDER:'deepseek',DEEPSEEK_API_KEY:process.env.DEEPSEEK_API_KEY,DEEPSEEK_MODEL:'deepseek-flash'};
if(!env.DEEPSEEK_API_KEY)throw Error('Private provider credential missing.');
const directory=process.env.SMOKE_OUTPUT||'tmp/provider-contract';
await mkdir(directory,{recursive:true});
const cases=[
  {id:'home-clock',setting:'home',players:4,age:'8-10',primary:'reasoning',secondary:['discussion'],idea:'A friendly clock keeper needs help restoring the noon bell.'},
  {id:'classroom-market',setting:'classroom',players:24,age:'6-8',primary:'discussion',secondary:['reasoning'],idea:'A night market courier needs to find the correct delivery and bring it to a friendly shopkeeper.'},
  {id:'home-garden',setting:'home',players:4,age:'10-12',primary:'sequence',secondary:['reasoning'],idea:'A rooftop garden crew must put a repair plan in order and restore a rain collector.'},
  {id:'classroom-code',setting:'classroom',players:20,age:'8-10',primary:'code',secondary:['reasoning'],idea:'A museum team decodes three short printed messages to restore a lost exhibit label.'},
];
const summaries=[];
for(const item of cases){
  let phase='plan',calls=0,blueprintRepairs=0;
  const privateFetch=async(url,options)=>{calls++;const response=await fetch(url,{...options,signal:AbortSignal.timeout(90000)});await writeFile(`${directory}/${item.id}-call-${calls}.json`,JSON.stringify({request:JSON.parse(options.body),response:await response.clone().json()},null,2));return response;};
  try{
    const {spec}=validatePurchase({sku:`custom_${item.setting}`,creatorVersion:3,customIdea:item.idea,setting:item.setting,players:item.players,age:item.age,paper:'A4',...(item.setting==='classroom'?{groups:Math.ceil(item.players/4)}:{}),gameplay:{primary:item.primary,secondary:item.secondary}});
    if(spec.packExperienceVersion!==3)throw Error('Linked-story contract is not enabled for a new purchase.');
    const planned=await generateSinglePlan(spec,env,privateFetch),approved={...spec,plan:planned.plan,planConfirmed:true};
    phase='blueprint';let blueprint,candidate=null,reason='';
    for(let attempt=0;attempt<5&&!blueprint;attempt++){
      try{blueprint=(attempt?await repairBlueprint(approved,candidate,reason,env,privateFetch):await generateBlueprint(approved,env,privateFetch)).blueprint;}
      catch(error){candidate=error.candidate;reason=error.message;
        console.log(JSON.stringify({id:item.id,phase:'blueprint-check',attempt:attempt+1,code:error.code||'CHECK_FAILED',rule:String(reason).slice(0,180)}));
        if(attempt===4)throw error;blueprintRepairs++;}
    }
    let story,stages=[];
    for(let attempt=0;attempt<7&&!story;attempt++){
      try{
        phase='checkpoints';
        while(stages.length<5){
          const number=stages.length+1;
          const stage=(await generateStagedCheckpoint(approved,blueprint,number,stages.at(-1),env,privateFetch)).stage;
          if(number<5)await auditCheckpointSemantics(stage,approved,env,privateFetch);
          stages.push(stage);
        }
        const candidate=assembleStagedStory(approved,blueprint,stages);
        phase='audit';
        await auditStagedStory(candidate,approved,blueprint,env,privateFetch);
        story=candidate;
      }catch(error){
        const failedStage=Number.isInteger(error.stageNumber)?error.stageNumber:0;
        console.log(JSON.stringify({id:item.id,phase,attempt:attempt+1,checkpoint:failedStage,code:error.code||'CHECK_FAILED',rule:String(error.message).slice(0,160)}));
        if(attempt===6||!['STAGE_SEMANTIC_INVALID','GENERATION_QA_FAILED'].includes(error.code))throw error;
        phase='repair';blueprintRepairs++;
        const previous=blueprint;
        blueprint=(await repairBlueprint(approved,previous,error.message,env,privateFetch)).blueprint;
        const changed=previous.stages.findIndex((stage,index)=>JSON.stringify(stage)!==JSON.stringify(blueprint.stages[index]));
        const keep=Math.min(stages.length,failedStage?failedStage-1:5,changed<0?5:changed);
        stages=stages.slice(0,keep);
      }
    }
    phase='pdf';
    if(verifyPrintedPuzzles(story).length!==5||story.spine?.links?.length!==4)throw Error('A printable finding or story link is missing.');
    await writeFile(`${directory}/${item.id}.json`,JSON.stringify({spec:approved,story},null,2));
    for(const paper of ['A4','Letter'])for(const role of ['player','guide']){
      const pdf=buildGamePdf(story,{...approved,paper},role),source=new TextDecoder().decode(pdf);
      const pages=Number(source.match(/\/Count (\d+)/)?.[1]);
      if(!source.startsWith('%PDF-')||pages<(role==='player'?12:7)||pages>(role==='player'?12:12))throw Error(`${role} ${paper} PDF page check failed.`);
      if(role==='guide'&&!source.includes('WHY THIS FINDING MATTERS'))throw Error('Adult story links are missing.');
      await writeFile(`${directory}/${item.id}-${role}-${paper}.pdf`,pdf);
    }
    // All fixtures are invented for this workflow. Never read customer orders here.
    summaries.push({id:item.id,passed:true,calls,blueprintRepairs,stages:story.stages.length});
  }catch(error){summaries.push({id:item.id,passed:false,phase,calls,blueprintRepairs,code:error.code||'CHECK_FAILED',detail:String(error.message).slice(0,160)});}
  console.log(JSON.stringify(summaries.at(-1)));
}
await writeFile(`${directory}/summary.json`,JSON.stringify(summaries,null,2));
if(summaries.some(item=>!item.passed))process.exitCode=1;
