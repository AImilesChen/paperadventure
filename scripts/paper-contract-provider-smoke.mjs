import {mkdir,writeFile} from 'node:fs/promises';
import {validatePurchase} from '../backend/domain.mjs';
import {generateSinglePlan} from '../backend/plan-proposals.mjs';
import {generateBlueprint,repairBlueprint,generateStagedCheckpoint,assembleStagedStory,auditStagedStory} from '../backend/staged-story.mjs';
import {buildGamePdf} from '../backend/pdf.mjs';

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
  const privateFetch=async(url,options)=>{calls++;return fetch(url,{...options,signal:AbortSignal.timeout(90000)});};
  try{
    const {spec}=validatePurchase({sku:`custom_${item.setting}`,creatorVersion:3,customIdea:item.idea,setting:item.setting,players:item.players,age:item.age,paper:'A4',...(item.setting==='classroom'?{groups:Math.ceil(item.players/4)}:{}),gameplay:{primary:item.primary,secondary:item.secondary}});
    const planned=await generateSinglePlan(spec,env,privateFetch),approved={...spec,plan:planned.plan,planConfirmed:true};
    phase='blueprint';let blueprint;
    try{blueprint=(await generateBlueprint(approved,env,privateFetch)).blueprint;}
    catch(error){blueprintRepairs++;blueprint=(await repairBlueprint(approved,error.candidate,error.message,env,privateFetch)).blueprint;}
    let story;
    for(let attempt=0;attempt<2;attempt++){
      phase='checkpoints';const stages=[];
      for(let number=1;number<=5;number++)stages.push((await generateStagedCheckpoint(approved,blueprint,number,stages.at(-1),env,privateFetch)).stage);
      story=assembleStagedStory(approved,blueprint,stages);phase='audit';
      try{await auditStagedStory(story,approved,blueprint,env,privateFetch);break;}
      catch(error){if(attempt||blueprintRepairs)throw error;blueprintRepairs++;blueprint=(await repairBlueprint(approved,blueprint,error.message,env,privateFetch)).blueprint;}
    }
    phase='pdf';
    for(const paper of ['A4','Letter'])for(const role of ['player','guide'])await writeFile(`${directory}/${item.id}-${role}-${paper}.pdf`,buildGamePdf(story,{...approved,paper},role));
    // All fixtures are invented for this workflow. Never read customer orders here.
    await writeFile(`${directory}/${item.id}.json`,JSON.stringify({spec:approved,story},null,2));
    summaries.push({id:item.id,passed:true,calls,blueprintRepairs,stages:story.stages.length});
  }catch(error){summaries.push({id:item.id,passed:false,phase,calls,blueprintRepairs,code:error.code||'CHECK_FAILED'});}
  console.log(JSON.stringify(summaries.at(-1)));
}
await writeFile(`${directory}/summary.json`,JSON.stringify(summaries,null,2));
if(summaries.some(item=>!item.passed))process.exitCode=1;
