import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

test('a delivered order renders its original download card during theme correction', async () => {
  const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' });
  try {
    const { OrderPackage, PackRemake, PaidPlanReview } = await vite.ssrLoadModule('/src/livePages.jsx');
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
    assert.match(retryHtml, /Retry corrected theme plan at no charge/);
    const recoveryHtml=renderToStaticMarkup(createElement(PackRemake,{order:{...order,paidAt:'2026-10-16',gamePackVersion:2,themePlanRecoveryAvailable:true,planReview:{...order.planReview,status:'confirmed',themeReplanAttempts:4}},refresh:()=>{}}));
    assert.match(recoveryHtml,/Your plan recovery is ready/);
    assert.match(recoveryHtml,/Start recovery at no charge/);
    assert.match(recoveryHtml,/Previous plan correction stopped/);
    assert.match(recoveryHtml,/review and approve the corrected plan/);
    const oldScenes={...order,planReview:{status:'review',qualityReplanUsed:true,activeVersion:2,confirmedVersion:1,storyScenesRequired:true,storySceneRepairAvailable:true,versions:[]}};
    const repairHtml=renderToStaticMarkup(createElement(PaidPlanReview,{order:oldScenes,refresh:()=>{}}));
    assert.match(repairHtml,/Repair story scenes at no charge/);
    assert.match(repairHtml,/does not use an included plan edit/);
    assert.match(repairHtml,/disabled=""[^>]*>Approve corrected plan and rebuild/);
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
      if(status==='review')assert.match(rendered,/href="#personal-plan-review"/);
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
    assert.match(stoppedHtml,/Continue saved plan check at no charge/);
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
    const delivered={...order,plan:{themeAnchors:['a translated theme']},planReview:{status:'confirmed',qualityReplanUsed:true},remake:{status:'ready',storyReady:true}};
    assert.equal(updateProgressState(delivered).completed,7);
    assert.equal(updateProgressState(delivered).busy,false);
    assert.equal(themeUpdatePending(delivered),false);
  } finally {
    await vite.close();
  }
});
