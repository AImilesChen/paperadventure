import { planFailureMessage } from '../shared/plan-quality.mjs';

export function themeUpdatePending(order) {
  const review=order.planReview;
  const hasUpdate=order.themePlanRepairAvailable||review?.qualityReplanUsed||review?.themeReplanAttempts>0;
  return Boolean(order.filesReady&&hasUpdate&&(
    review?.qualityReplanUsed&&review.status!=='confirmed'||
    !order.plan?.themeAnchors?.length||!order.remake||order.remake.status!=='ready'));
}

export function updateProgressState(order) {
  const review=order.planReview||{},work=review.progress,remake=order.remake;
  const themePath=Boolean(review.qualityReplanUsed||review.themeReplanAttempts||order.themePlanRepairAvailable);
  const planPending=themePath&&(review.status!=='confirmed'||review.themeReplanFailed||!remake);
  if(planPending){
    const failed=Boolean(review.themeReplanFailed),waiting=review.status==='review';
    const completed=waiting?2:work?.reviewPassed?2:work?.candidateSaved?1:0;
    const labels={queued:'Waiting to prepare the corrected plan',generating:'Preparing the corrected plan',validating:'Checking the plan format',repairing:'Correcting the saved plan',correcting:'Correcting the saved plan',auditing:'Reviewing the theme and story',ready:'Saving the reviewed plan'};
    return {completed,current:waiting?2:Math.min(completed,1),busy:!waiting&&!failed&&['queued','generating'].includes(review.status),
      label:failed?order.themePlanRecoveryAvailable?'Previous plan correction stopped':'Plan correction stopped':waiting?review.storyScenesRequired?'Story scenes need repair before approval':'Your action is needed: review and approve the corrected plan':labels[work?.phase]||labels[review.status]||'Corrected plan not started',
      failed,waiting,updatedAt:work?.updatedAt,reason:failed?planFailureMessage(work?.failureCode||review.themeReplanFailureCode):null};
  }
  if(!remake)return null;
  const complete=remake.status==='ready';
  const current=complete?6:remake.storyReady||['pdf','storage'].includes(remake.phase)?5:remake.phase==='audit'?4:3;
  return {completed:complete?7:current,current,busy:['queued','generating'].includes(remake.status),failed:remake.status==='failed',waiting:false,
    label:complete?'Replacement game pack ready':remake.status==='failed'?'Replacement game creation stopped':current===5?'Creating and checking both PDFs':current===4?'Checking the complete game':'Building the five checkpoints',updatedAt:remake.updatedAt};
}

export default function OrderUpdateProgress({order}) {
  const state=updateProgressState(order);
  if(!state)return null;
  const steps=['Prepare corrected plan','Check plan','Approve plan','Build five checkpoints','Check game','Create PDFs','Update complete'];
  const hasSavedProgress=state.completed>0||state.waiting||state.failed;
  return <div className="order-update-progress" aria-label="Replacement game pack progress" aria-busy={state.busy}>
    <p className="order-update-status" role="status">{state.label}</p>
    <progress max={7} {...(hasSavedProgress?{value:state.completed}:{})} aria-label="Saved replacement milestones"/>
    <p className="live-note">{state.completed} of 7 milestones completed. Progress records saved steps, not elapsed time.</p>
    <ol className="order-update-steps">{steps.map((label,index)=><li key={label} className={index<state.completed?'is-complete':index===state.current?'is-current':''} aria-current={index===state.current?'step':undefined}><span>{index<state.completed?'✓':index+1}</span>{label}</li>)}</ol>
    {state.failed&&state.reason&&<p className="live-note">Last plan check: {state.reason}</p>}
    {state.waiting&&<a className="button" href="#personal-plan-review">{order.planReview?.storyScenesRequired?'Review story scenes before approval':'Review and approve corrected plan'}</a>}
    {state.updatedAt&&<p className="live-note">Last saved update: {new Date(state.updatedAt.replace(' ','T')+'Z').toLocaleString()}.</p>}
    {state.busy&&<p className="live-note">Status updates automatically while this page is open. You can return to this order later.</p>}
  </div>;
}
