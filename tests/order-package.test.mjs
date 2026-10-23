import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

test('a delivered order renders its original download card during theme correction', async () => {
  const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' });
  try {
    const { OrderPackage, PackRemake, PaidPlanReview, OrderNextStep, orderNextStep } = await vite.ssrLoadModule('/src/livePages.jsx');
    const {updateProgressState,themeUpdatePending}=await vite.ssrLoadModule('/src/orderUpdateProgress.jsx');
    const order = {
      id: 'example-order', kind: 'custom', sku: 'custom_classroom', status: 'published',
      filesReady: true, paper: 'A4', plan: { title: 'A classroom adventure' },
      planReview: { confirmedVersion: 1, themeReplanAttempts: 1, themeReplanFailed: true },
      themePlanRepairAvailable: true, contentReviewPassed: true,
      generationProgress: {phase:'delivered',blueprintReady:true,completedStages:[1,2,3,4,5],auditPassed:true,storyReady:true},
    };
    const html = renderToStaticMarkup(createElement(OrderPackage, { order, orderId: order.id, selectedPaper: 'A4' }));
    assert.match(html, /Original pack ready to download/);
    assert.match(html, /corrected theme plan and replacement PDFs have not been delivered/);
    assert.match(html, /Player Pack/);
    assert.match(html, /Teacher Guide/);
    assert.match(html, /Original version complete/);
    assert.match(html, /These checks apply to the original version/);
    const retryHtml = renderToStaticMarkup(createElement(PackRemake, { order: {
      ...order, paidAt: '2026-10-16', gamePackVersion: 2,
      planReview: { ...order.planReview, themeReplanAttempts: 2, themeReplanFailureCode: null },
    }, refresh: () => {} }));
    assert.match(retryHtml, /existing allowance/);
    assert.match(retryHtml, /did not record a specific failure reason/);
    assert.match(retryHtml, /Update game pack at no charge/);
    const recoveryHtml=renderToStaticMarkup(createElement(PackRemake,{order:{...order,paidAt:'2026-10-16',gamePackVersion:2,themePlanRecoveryAvailable:true,planReview:{...order.planReview,status:'confirmed',themeReplanAttempts:4}},refresh:()=>{}}));
    assert.match(recoveryHtml,/Your plan recovery is ready/);
    assert.match(recoveryHtml,/Update game pack at no charge/);
    assert.match(recoveryHtml,/Previous plan correction stopped/);
    assert.match(recoveryHtml,/review and approve the corrected plan/);
    const oldScenes={...order,planReview:{status:'review',qualityReplanUsed:true,activeVersion:2,confirmedVersion:1,storyScenesRequired:true,storySceneRepairAvailable:true,versions:[]}};
    const repairHtml=renderToStaticMarkup(createElement(PaidPlanReview,{order:oldScenes,refresh:()=>{}}));
    assert.match(repairHtml,/Update game pack at no charge/);
    assert.match(repairHtml,/does not use an included plan edit/);
    assert.doesNotMatch(repairHtml,/Approve this plan and create PDFs/);
    assert.match(updateProgressState(oldScenes).label,/need repair before approval/);
    for(const [status,progress,expected] of [
      ['queued',null,'Waiting to prepare'],
      ['generating',{phase:'auditing',candidateSaved:true,formatChecked:true},'Reviewing the theme and story'],
      ['review',{phase:'ready',candidateSaved:true,formatChecked:true,reviewPassed:true},'Your action is needed'],
    ]){
      const inFlight={...order,paidAt:'2026-10-16',gamePackVersion:2,plan:{themeAnchors:['a translated theme']},planReview:{status,qualityReplanUsed:true,confirmedVersion:1,activeVersion:status==='review'?2:1,progress}};
      const rendered=renderToStaticMarkup(createElement(PackRemake,{order:inFlight,refresh:()=>{}}));
      assert.match(rendered,new RegExp(expected));
      assert.match(rendered,/Replacement game pack progress/);
      assert.equal(rendered.includes('aria-busy="true"'),status!=='review');
      if(status==='review')assert.doesNotMatch(rendered,/href="#personal-plan-review"/,'progress does not duplicate the single next-step link');
      const original=renderToStaticMarkup(createElement(OrderPackage,{order:inFlight,orderId:order.id,selectedPaper:'A4'}));
      assert.match(original,/Original version complete/,'a corrected plan awaiting approval is not a delivered replacement');
    }
    const failedOrder={...order,paidAt:'2026-10-16',gamePackVersion:2,themePlanRepairAvailable:false,planReview:{...order.planReview,status:'confirmed',progress:{phase:'failed',candidateSaved:true,failureCode:'PLAN_AUDIT_INVALID'}}};
    const failedHtml=renderToStaticMarkup(createElement(PackRemake,{order:failedOrder,refresh:()=>{}}));
    assert.match(failedHtml,/review returned an invalid result/);
    assert.doesNotMatch(failedHtml,/aria-busy="true"|<progress[^>]*value="7"/);
    const formatStopped={...failedOrder,qualityUpgradeAvailable:true,plan:{themeAnchors:['Journey to the West']},remake:{status:'ready'},planReview:{...failedOrder.planReview,activeVersion:2,confirmedVersion:1,formatResumeAvailable:true,progress:{phase:'failed',candidateSaved:true,failureCode:'PLAN_PRINT_FIT',formatIssue:{field:'storyBeat',stage:2,rule:'length',length:197,limit:140}}}};
    const stoppedHtml=renderToStaticMarkup(createElement(PackRemake,{order:formatStopped,refresh:()=>{}}));
    assert.match(stoppedHtml,/Story plan correction stopped/);
    assert.match(stoppedHtml,/Checkpoint 2: Story event has 197 characters; the limit is 140/);
    assert.match(stoppedHtml,/Update game pack at no charge/);
    assert.doesNotMatch(stoppedHtml,/Create quality-checked pack|Create improved pack|Your new game pack is ready/);
    assert.equal(themeUpdatePending(formatStopped),true,'an older ready remake does not mean the failed replacement was delivered');
    const stoppedDownloads=renderToStaticMarkup(createElement(OrderPackage,{order:formatStopped,orderId:order.id,selectedPaper:'A4'}));
    assert.match(stoppedDownloads,/Original pack ready to download/);
    const stoppedReview=renderToStaticMarkup(createElement(PaidPlanReview,{order:{...formatStopped,planReview:{...formatStopped.planReview,versions:[]}},refresh:()=>{}}));
    assert.match(stoppedReview,/Replacement plan not approved/);
    assert.match(stoppedReview,/Version 2 is saved but has not been approved/);
    assert.match(stoppedReview,/Version 1 remains approved for your existing files/);
    for(const [phase,storyReady,completed] of [['blueprint',false,3],['checkpoint',false,3],['audit',false,4],['pdf',true,5],['storage',true,5]]){
      const building={...order,plan:{themeAnchors:['a translated theme']},planReview:{status:'confirmed',qualityReplanUsed:true},remake:{status:'generating',phase,storyReady}};
      assert.equal(updateProgressState(building).completed,completed);
      assert.equal(themeUpdatePending(building),true);
    }
    const copyStopped={...order,paidAt:'2026-10-17',themePlanRepairAvailable:false,plan:{themeAnchors:['a translated theme']},planReview:{status:'confirmed',qualityReplanUsed:true},remake:{status:'failed',phase:'audit',completedStages:[1,2,3,4,5],copyResumeAvailable:true,recoveryAvailable:true,copyCheck:{phase:'format',message:'The saved wording did not pass its format check.'},failureReason:'The saved wording did not pass its format check.'}};
    const copyHtml=renderToStaticMarkup(createElement(PackRemake,{order:copyStopped,refresh:()=>{}}));
    assert.match(copyHtml,/Continue saved game check at no charge/);
    assert.match(copyHtml,/Last game check: The saved wording did not pass its format check/);
    assert.doesNotMatch(copyHtml,/New pack stopped at the game review/);
    const factGap={...copyStopped,remake:{...copyStopped.remake,copyResumeAvailable:false,copyCheck:{...copyStopped.remake.copyCheck,factRepairAvailable:true}}};
    assert.match(renderToStaticMarkup(createElement(PackRemake,{order:factGap,refresh:()=>{}})),/Complete saved facts and review at no charge/);
    const delivered={...order,plan:{themeAnchors:['a translated theme']},planReview:{status:'confirmed',qualityReplanUsed:true},remake:{status:'ready',storyReady:true}};
    assert.equal(updateProgressState(delivered).completed,7);
    assert.equal(updateProgressState(delivered).busy,false);
    assert.equal(themeUpdatePending(delivered),false);
    const preparing={...order,status:'paid',filesReady:false,paidAt:'2026-10-21',planReview:{status:'generating',pending:'initial',progress:null}};
    for(const [progress,saved,label] of [
      [null,null,'Working on the first step'],
      [{phase:'validating',candidateSaved:true},1,'Checking the plan structure'],
      [{phase:'auditing',candidateSaved:true,formatChecked:true},2,'Checking the story and theme'],
      [{phase:'ready',candidateSaved:true,formatChecked:true,reviewPassed:true},3,'Saving your plan for review'],
    ]){
      const banner=renderToStaticMarkup(createElement(OrderNextStep,{order:{...preparing,planReview:{...preparing.planReview,progress}}}));
      assert.match(banner,/Personal plan preparation progress/);
      assert.match(banner,new RegExp(label));
      assert.match(banner,saved===null?/<progress[^>]*max="3"(?![^>]*value=)/:new RegExp(`<progress[^>]*max="3"[^>]*value="${saved}"`));
      assert.doesNotMatch(banner,/\d+%|estimated time/i,'the plan bar must not invent a percentage or ETA');
    }
    const reviewReady=renderToStaticMarkup(createElement(OrderNextStep,{order:{...preparing,planReview:{status:'review',pending:null,progress:{phase:'ready',reviewPassed:true}}}}));
    assert.doesNotMatch(reviewReady,/Personal plan preparation progress/,'the progress bar stops when the plan is ready for approval');
    const nextCases=[
      [{...order,paidAt:'2026-10-16',planReview:{status:'review',activeVersion:2,confirmedVersion:1,qualityReplanUsed:true}},'Review the corrected plan','#personal-plan-review'],
      [{...order,paidAt:'2026-10-16',planReview:{status:'review',pending:'correction',confirmedVersion:1,qualityReplanUsed:true}},'Your corrected plan is being prepared',null],
      [{...order,paidAt:'2026-10-16',planReview:{status:'review',activeVersion:2,confirmedVersion:1,qualityReplanUsed:true,storyScenesRequired:true,storySceneRepairAvailable:true}},'Repair the story scenes','#personal-plan-review'],
      [{...order,paidAt:'2026-10-16',planReview:{status:'review',activeVersion:2,confirmedVersion:1,qualityReplanUsed:true,storyScenesRequired:true}},'Get help with the story scenes','#order-help'],
      [{...order,paidAt:'2026-10-16',planReview:{status:'confirmed',confirmedVersion:1},remake:{status:'generating'}},'Your new game pack is being prepared',null],
      [{...copyStopped,planReview:{status:'confirmed',confirmedVersion:1}},'Continue the saved game check','#order-remake'],
      [{...delivered,paidAt:'2026-10-16'},'Download your game','#download-game'],
    ];
    for(const [value,title,href] of nextCases){
      assert.equal(orderNextStep(value).title,title);
      assert.equal(orderNextStep(value).href||null,href);
      const banner=renderToStaticMarkup(createElement(OrderNextStep,{order:value}));
      if(href==='#download-game')assert.equal(banner,'','ready files are shown directly in the download section');
      else assert.equal((banner.match(/class="button"/g)||[]).length,href?1:0,'only one primary next-step link is shown');
    }
    assert.equal(renderToStaticMarkup(createElement(OrderNextStep,{order:{...delivered,kind:'ready',paidAt:'2026-10-16'}})),'','ready-made downloads also need no duplicate banner');
    const plainReady={...order,planReview:{status:'confirmed',confirmedVersion:1},themePlanRepairAvailable:false};
    const readyHtml=renderToStaticMarkup(createElement(OrderPackage,{order:plainReady,orderId:order.id,selectedPaper:'A4'}));
    assert.match(readyHtml,/Download complete game · ZIP/);
    assert.doesNotMatch(readyHtml,/order-game-progress|order-package-files/,'a finished order shows downloads directly');
    const recoverable={...order,status:'failed',filesReady:false,paidAt:'2026-10-16',planReview:{status:'confirmed',confirmedVersion:1},themePlanRepairAvailable:false,deliveryRetryAvailable:true};
    assert.equal(renderToStaticMarkup(createElement(OrderNextStep,{order:recoverable})),'','the recovery control replaces the jump link');
    assert.match(html,/Download existing PDFs while the replacement is pending/);
    assert.match(html,/Download original game · ZIP/);
  } finally {
    await vite.close();
  }
});

test('initial generation shows saved blueprint parts and distinguishes waiting from active work',async()=>{
  const vite=await createServer({server:{middlewareMode:true},appType:'custom',logLevel:'silent'});
  try{
    const {OrderPackage}=await vite.ssrLoadModule('/src/livePages.jsx');
    const order={id:'step-order',kind:'custom',sku:'custom_home',status:'fulfilling',filesReady:false,paper:'A4',planReview:{confirmedVersion:1},
      generationProgress:{phase:'blueprint',blueprintReady:false,completedStages:[],auditPassed:false,storyReady:false,
        blueprintStepsCompleted:3,blueprintStepTotal:8,activeStep:'blueprint_material',activeStage:2,stepState:'waiting_for_update',lastSavedAt:'2026-10-23 11:00:00'}};
    const html=renderToStaticMarkup(createElement(OrderPackage,{order,orderId:order.id,selectedPaper:'A4'}));
    assert.match(html,/3 of 8 parts saved/);assert.match(html,/aria-valuenow="3"/);assert.match(html,/aria-valuemax="15"/);
    assert.match(html,/Waiting for a new update/);assert.match(html,/Preparing material 2 of 5/);assert.match(html,/Last saved:/);
    const ready={...order,status:'published',filesReady:true,generationProgress:{...order.generationProgress,phase:'delivered',stepState:'complete',deliveryEdition:'baseline',completedStages:[1,2,3,4,5]}};
    const final=renderToStaticMarkup(createElement(OrderPackage,{order:ready,orderId:order.id,selectedPaper:'A4'}));
    assert.match(final,/paper mission briefing is ready/);assert.match(final,/Download complete game/);
  }finally{await vite.close();}
});
