const phases=new Set(['blueprint_frame','blueprint_material','blueprint_closing','blueprint','checkpoint','audit']);
export async function savedGenerationProgress(db,order,activity,base){
  const rows=(await db.prepare('SELECT phase,stage_number,status,created_at,completed_at,error_code FROM custom_generation_calls WHERE order_id = ? ORDER BY rowid').bind(order.id).all()).results||[];
  const parts=new Set(rows.filter(row=>row.status==='passed'&&['blueprint_frame','blueprint_material','blueprint_closing'].includes(row.phase)).map(row=>`${row.phase}:${row.stage_number}`));
  const latest=rows.at(-1),saved=rows.filter(row=>row.status==='passed').at(-1);
  const lastUpdate=latest?.completed_at||latest?.created_at;
  const age=lastUpdate?Date.now()-Date.parse(lastUpdate.replace(' ','T')+'Z'):0;
  const state=order.status==='published'?'complete':order.status==='failed'?'stopped':
    activity.status==='queued'?'queued':age>240000?'waiting_for_update':latest?.status==='failed'?'retrying':'running';
  return {...base,blueprintStepsCompleted:base.blueprintReady?8:Math.min(parts.size,7),blueprintStepTotal:8,
    activeStep:phases.has(latest?.phase)?latest.phase:null,activeStage:Number(latest?.stage_number)||0,
    stepState:state,updatedAt:lastUpdate||null,lastSavedAt:saved?.completed_at||null,
    retryCount:rows.filter(row=>row.status==='failed').length};
}
