import {mkdir,writeFile,readFile,readdir} from 'node:fs/promises';
import {validatePurchase} from '../backend/domain.mjs';
import {generateSinglePlan} from '../backend/plan-proposals.mjs';
import {repairBlueprint,generateStagedCheckpoint,assembleStagedStory,auditStagedStory,auditCheckpointSemantics,
  generateBlueprintFrameStep,generateBlueprintMaterialStep,generateBlueprintClosingStep,assembleBlueprintSteps} from '../backend/staged-story.mjs';
import {buildGamePdf} from '../backend/pdf.mjs';
import {verifyPrintedPuzzles} from '../backend/paper-proof.mjs';
import {clockSpec as checkedClockSpec} from '../content/paper-contract-qa.mjs';

const env={AI_PROVIDER:'deepseek',DEEPSEEK_API_KEY:process.env.DEEPSEEK_API_KEY,DEEPSEEK_MODEL:'deepseek-flash'};
if(!env.DEEPSEEK_API_KEY)throw Error('Private provider credential missing.');
const directory=process.env.SMOKE_OUTPUT||'tmp/provider-contract';
await mkdir(directory,{recursive:true});
const cases=[
  {id:'home-clock',setting:'home',players:4,age:'8-10',primary:'reasoning',secondary:['discussion'],idea:'A friendly clock keeper needs help restoring the noon bell.'},
  {id:'classroom-journey',setting:'classroom',players:4,age:'8-10',primary:'discussion',secondary:['reasoning'],idea:'西游记，东方神话元素'},
  {id:'classroom-market',setting:'classroom',players:24,age:'6-8',primary:'discussion',secondary:['reasoning'],idea:'A night market courier needs to find the correct delivery and bring it to a friendly shopkeeper.'},
  {id:'home-garden',setting:'home',players:4,age:'10-12',primary:'sequence',secondary:['reasoning'],idea:'A rooftop garden crew must put a repair plan in order and restore a rain collector.'},
  {id:'classroom-code',setting:'classroom',players:20,age:'8-10',primary:'code',secondary:['reasoning'],idea:'A museum team decodes three short printed messages to restore a lost exhibit label.'},
];
const selectedIds=new Set(String(process.env.SMOKE_CASE_IDS||'home-clock').split(',').map(value=>value.trim()).filter(Boolean));
const maxProviderCalls=Number(process.env.SMOKE_MAX_PROVIDER_CALLS||12);
const summaries=[];
for(const item of cases.filter(item=>!selectedIds.size||selectedIds.has(item.id))){
  let phase='plan',calls=0,blueprintRepairs=0,inputTokens=0,outputTokens=0;
  const replay=[];
  if(process.env.SMOKE_REPLAY_DIR)for(const file of await readdir(process.env.SMOKE_REPLAY_DIR)){
    const match=file.match(new RegExp(`^${item.id}-call-(\\d+)\\.json$`));if(!match)continue;
    const text=await readFile(`${process.env.SMOKE_REPLAY_DIR}/${file}`,'utf8');
    const saved=JSON.parse(text);replay.push(saved);calls=Math.max(calls,Number(match[1]));inputTokens+=saved.response.usage?.input_tokens||0;outputTokens+=saved.response.usage?.output_tokens||0;await writeFile(`${directory}/${file}`,text);
  }
  const privateFetch=async(url,options)=>{
    const request=JSON.parse(options.body);
    const index=replay.findIndex(saved=>saved.request.text.format.name===request.text.format.name&&saved.request.input===request.input&&
      (request.text.format.name==='paid_adventure_plan'||saved.request.instructions===request.instructions));
    if(index>=0)return Response.json(replay.splice(index,1)[0].response);
    if(calls>=maxProviderCalls){const error=Error(`Synthetic provider-call cap ${maxProviderCalls} reached.`);error.code='SMOKE_BUDGET_EXHAUSTED';throw error;}
    calls++;const response=await fetch(url,{...options,signal:AbortSignal.timeout(90000)}),body=await response.clone().json();inputTokens+=body.usage?.input_tokens||0;outputTokens+=body.usage?.output_tokens||0;await writeFile(`${directory}/${item.id}-call-${calls}.json`,JSON.stringify({request,response:body},null,2));return response;
  };
  try{
    const {spec}=validatePurchase({sku:`custom_${item.setting}`,creatorVersion:3,customIdea:item.idea,setting:item.setting,players:item.players,age:item.age,paper:'A4',...(item.setting==='classroom'?{groups:Math.ceil(item.players/4)}:{}),gameplay:{primary:item.primary,secondary:item.secondary}});
    if(spec.packExperienceVersion!==3)throw Error('Linked-story contract is not enabled for a new purchase.');
    // The one-theme release check exercises pack generation, not another paid
    // plan proposal. Reuse the checked synthetic plan so every provider call is
    // spent on the part being released.
    const planned=item.id==='home-clock'?{plan:checkedClockSpec.plan}:await generateSinglePlan(spec,env,privateFetch,{kind:'full',maxProviderCalls:2}),approved={...spec,plan:planned.plan,planConfirmed:true};
    phase='blueprint';
    const frame=(await generateBlueprintFrameStep(approved,env,privateFetch)).storyFrame;
    const materials=[];
    for(let number=1;number<=5;number++)materials.push((await generateBlueprintMaterialStep(approved,frame,number,materials,env,privateFetch)).data);
    const closing=(await generateBlueprintClosingStep(approved,frame,env,privateFetch)).data.celebration;
    let blueprint;
    try{blueprint=(await assembleBlueprintSteps(approved,frame,materials,closing,env,privateFetch)).blueprint;}
    catch(error){
      if(!error.candidate||!/^Checkpoint [1-5]/i.test(String(error.message)))throw error;
      blueprintRepairs++;
      console.log(JSON.stringify({id:item.id,phase:'blueprint-check',attempt:1,code:error.code||'CHECK_FAILED',rule:String(error.message).slice(0,180)}));
      blueprint=(await repairBlueprint(approved,error.candidate,error.message,env,privateFetch)).blueprint;
    }
    let story,stages=[];
    for(let attempt=0;attempt<3&&!story;attempt++){
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
        if(attempt===2||!['STAGE_SEMANTIC_INVALID','GENERATION_QA_FAILED'].includes(error.code))throw error;
        phase='repair';blueprintRepairs++;
        const previous=blueprint;
        let repairReason=error.message,repaired;
        for(let repairTry=0;repairTry<3&&!repaired;repairTry++){
          try{repaired=(await repairBlueprint(approved,previous,repairReason,env,privateFetch)).blueprint;}
          catch(repairError){
            console.log(JSON.stringify({id:item.id,phase:'repair-check',checkpoint:failedStage,attempt:repairTry+1,code:repairError.code||'CHECK_FAILED',rule:String(repairError.message).slice(0,160)}));
            if(repairTry===2)throw repairError;
            repairReason=`Checkpoint ${failedStage}: ${repairError.message}`;
          }
        }
        blueprint=repaired;
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
    summaries.push({id:item.id,passed:true,calls,blueprintRepairs,inputTokens,outputTokens,stages:story.stages.length});
  }catch(error){summaries.push({id:item.id,passed:false,phase,calls,blueprintRepairs,inputTokens,outputTokens,code:error.code||'CHECK_FAILED',detail:String(error.message).slice(0,160)});}
  console.log(JSON.stringify(summaries.at(-1)));
}
await writeFile(`${directory}/summary.json`,JSON.stringify(summaries,null,2));
if(summaries.some(item=>!item.passed))process.exitCode=1;

