// Explicit owner-requested operator repair. No customer retry grant, artifact
// export, queue delivery, approval, payment or published PDF is changed here.
import {execFileSync} from 'node:child_process';
import {writeFile,unlink} from 'node:fs/promises';
import {join} from 'node:path';
import {generateSinglePlan,planFailureCategory} from '../backend/plan-proposals.mjs';
import {PLAN_REVIEW_POLICY} from '../shared/plan-quality.mjs';
import {sha256} from '../backend/security.mjs';

const orderId='79bb86c7-93b0-4088-ba7a-4a04cd1b2f34';
const requestId='operator-coherent-plan-79bb-20261016';
const feedback='Restore the purchased story world consistently in the premise, goal and all five events. Preserve the purchased setup and goal; this is an operator repair, not a preference edit.';
const literal=value=>value==null?'NULL':`'${String(value).replaceAll("'","''")}'`;
const file=join(process.env.RUNNER_TEMP||'tmp','scoped-plan-repair.sql');
async function sql(command,read=false){
  await writeFile(file,command);
  try{
    // D1 --file imports return an execution receipt, not SELECT rows. Reads
    // use --command with captured output; private writes stay in a temp file.
    const raw=execFileSync('npx',['--yes','wrangler@4.74.0','d1','execute','paper-adventure-stage-db','--remote','--json',...(read?['--command',command]:['--file',file])],{encoding:'utf8',stdio:['ignore','pipe','pipe'],maxBuffer:8*1024*1024});
    return JSON.parse(raw.slice(raw.indexOf('[')));
  }catch{throw Object.assign(Error('Private database operation failed.'),{code:'OPERATOR_DB_FAILED'});}
  finally{await unlink(file).catch(()=>{});}
}
async function first(command){return (await sql(command,true))[0]?.results?.[0];}

try{
  if(process.env.CONFIRM_SCOPED_PLAN_REPAIR!==orderId)throw Object.assign(Error(),{code:'OPERATOR_SCOPE_REQUIRED'});
  const existing=await first(`SELECT status,result_version FROM custom_plan_requests WHERE id=${literal(requestId)}`);
  const savedCheck=existing&&process.env.VERIFY_SAVED_PLAN_ONLY==='1'?await first(`SELECT context_sha256,checkpoint_json,provider_calls,plan_valid,audit_passed,error_code FROM custom_plan_work WHERE request_id=${literal(requestId)}`):null;
  const auditOnly=Boolean(existing?.status==='failed'&&savedCheck?.provider_calls===2&&savedCheck.plan_valid===1&&!savedCheck.audit_passed&&savedCheck.error_code==='PLAN_CALL_BUDGET'&&JSON.parse(savedCheck.checkpoint_json||'{}').audit==null);
  const callLimit=auditOnly?3:2,previousCalls=auditOnly?2:0;
  if(process.env.VERIFY_SAVED_PLAN_ONLY==='1'&&!auditOnly&&!existing)throw Object.assign(Error(),{code:'OPERATOR_SAVED_PLAN_REQUIRED'});
  if(existing&&!auditOnly){console.log(JSON.stringify({status:'already_recorded',ready:existing.status==='published',version:existing.result_version||null,providerCalls:0}));}
  else{
    const snapshot=await first(`SELECT o.status AS order_status,o.purchase_spec_json,p.status AS plan_status,p.active_version,p.confirmed_version,p.quality_replan_used,
      (SELECT plan_json FROM custom_plan_versions WHERE order_id=o.id AND version_number=p.confirmed_version) AS previous_plan,
      (SELECT COUNT(*) FROM custom_plan_requests WHERE order_id=o.id AND status IN ('queued','generating')) AS pending,
      (SELECT COALESCE(MAX(version_number),0) FROM custom_plan_versions WHERE order_id=o.id) AS latest
      FROM orders o JOIN custom_plan_orders p ON p.order_id=o.id WHERE o.id=${literal(orderId)} AND o.product_kind='custom' AND o.paid_at IS NOT NULL`);
    if(!snapshot||snapshot.order_status!=='published'||snapshot.plan_status!=='confirmed'||snapshot.active_version!==2||snapshot.confirmed_version!==1||snapshot.latest!==2||snapshot.quality_replan_used||snapshot.pending)
      throw Object.assign(Error(),{code:'OPERATOR_STATE_CHANGED'});
    const spec={...JSON.parse(snapshot.purchase_spec_json),packQualityVersion:14};
    const previousPlan=JSON.parse(snapshot.previous_plan);
    if(spec.creatorVersion!==3||spec.packContractVersion!==1||spec.setting!=='classroom'||!/西游|journey to the west/i.test(spec.customIdea||''))throw Object.assign(Error(),{code:'OPERATOR_SPEC_CHANGED'});
    if(process.env.PLAN_REPAIR_READ_ONLY==='1'){console.log(JSON.stringify({status:'state_verified',active:snapshot.active_version,confirmed:snapshot.confirmed_version,providerCalls:0}));process.exit(0);}
    const context=await sha256(JSON.stringify({policy:PLAN_REVIEW_POLICY,spec,kind:'full',scope:null,feedback,previousPlan}));
    if(auditOnly&&context!==savedCheck.context_sha256)throw Object.assign(Error(),{code:'OPERATOR_SPEC_CHANGED'});
    // A failed-status reservation is deliberately never picked up by the queue
    // or scheduled retries. Initial work spends at most two calls. The explicit
    // saved-plan mode permits only one third call, an audit of valid saved text.
    if(!auditOnly)await sql(`INSERT INTO custom_plan_requests (id,order_id,kind,feedback,base_version,status,attempts) VALUES (${literal(requestId)},${literal(orderId)},'full',${literal(feedback)},1,'failed',1);
      INSERT INTO custom_plan_work (request_id,order_id,context_sha256) VALUES (${literal(requestId)},${literal(orderId)},${literal(context)});`);
    let result;
    try{
      const scopedFetch=(url,options)=>{
        if(auditOnly&&JSON.parse(options.body)?.text?.format?.name!=='paid_plan_audit')throw Object.assign(Error(),{code:'OPERATOR_AUDIT_ONLY'});
        return fetch(url,options);
      };
      result=await generateSinglePlan(spec,{AI_PROVIDER:'deepseek',DEEPSEEK_API_KEY:process.env.DEEPSEEK_API_KEY,DEEPSEEK_MODEL:'deepseek-flash'},scopedFetch,{
        kind:'full',feedback,previousPlan,maxProviderCalls:callLimit,previousCalls,...(auditOnly?{resume:{...JSON.parse(savedCheck.checkpoint_json),correctionUsed:true}}:{}),
        onBeforeCall:async count=>{const row=await first(`SELECT provider_calls AS n FROM custom_plan_work WHERE request_id=${literal(requestId)}`);if(row?.n!==count-1||count>callLimit)throw Object.assign(Error(),{code:'PLAN_CALL_BUDGET'});await sql(`UPDATE custom_plan_work SET provider_calls=${count},updated_at=CURRENT_TIMESTAMP WHERE request_id=${literal(requestId)} AND provider_calls=${count-1}`);},
        onPhase:async phase=>{await sql(`UPDATE custom_plan_work SET phase=${literal(phase)},updated_at=CURRENT_TIMESTAMP WHERE request_id=${literal(requestId)}`);},
        onCheckpoint:async saved=>{await sql(`UPDATE custom_plan_work SET checkpoint_json=${literal(JSON.stringify(saved))},candidate_saved=${saved.candidate!==null?1:0},plan_valid=${saved.valid?1:0},audit_passed=${saved.audit?.pass?1:0},error_code=${literal(saved.errorCode)},updated_at=CURRENT_TIMESTAMP WHERE request_id=${literal(requestId)}`);},
      });
    }catch(error){
      const code=planFailureCategory(error);
      await sql(`UPDATE custom_plan_work SET phase='failed',error_code=${literal(code)},updated_at=CURRENT_TIMESTAMP WHERE request_id=${literal(requestId)};
        UPDATE custom_plan_requests SET completed_at=CURRENT_TIMESTAMP WHERE id=${literal(requestId)};
        INSERT INTO generation_usage (order_id,attempt,response_id,model,input_tokens,output_tokens,status,phase,error_code,error_detail,completed_at)
        SELECT ${literal(orderId)},COALESCE(MAX(attempt),0)+1,${literal(error.responseId)},'deepseek-flash',${error.usage?.input_tokens||0},${error.usage?.output_tokens||0},'plan-failed','plan',${literal(code)},${literal('provider_calls='+(error.providerCalls||0))},CURRENT_TIMESTAMP FROM generation_usage WHERE order_id=${literal(orderId)};`);
      console.log(JSON.stringify({status:'stopped',code,calls:error.providerCalls||0}));process.exitCode=1;
    }
    if(result){
      // Recheck before inserting an unapproved version. A changed order cannot
      // receive this repair; existing plan versions and PDFs are never replaced.
      const encoded=literal(JSON.stringify(result.plan)),id=literal(orderId),request=literal(requestId);
      await sql(`INSERT INTO custom_plan_versions (order_id,version_number,plan_json,request_kind)
        SELECT ${id},3,${encoded},'full' WHERE EXISTS (SELECT 1 FROM custom_plan_orders WHERE order_id=${id} AND status='confirmed' AND active_version=2 AND confirmed_version=1 AND quality_replan_used=0)
        AND NOT EXISTS (SELECT 1 FROM custom_plan_versions WHERE order_id=${id} AND version_number>2)
        AND EXISTS (SELECT 1 FROM custom_plan_work WHERE request_id=${request} AND audit_passed=1 AND provider_calls<=${callLimit});
        UPDATE custom_plan_orders SET status='review',active_version=3,quality_replan_used=1,updated_at=CURRENT_TIMESTAMP WHERE order_id=${id} AND status='confirmed' AND active_version=2 AND confirmed_version=1 AND EXISTS (SELECT 1 FROM custom_plan_versions WHERE order_id=${id} AND version_number=3 AND plan_json=${encoded});
        UPDATE custom_plan_requests SET status='published',result_version=3,completed_at=CURRENT_TIMESTAMP WHERE id=${request} AND EXISTS (SELECT 1 FROM custom_plan_orders WHERE order_id=${id} AND status='review' AND active_version=3);
        INSERT INTO generation_usage (order_id,attempt,response_id,model,input_tokens,output_tokens,status,phase,error_detail,completed_at)
        SELECT ${id},COALESCE(MAX(attempt),0)+1,${literal(result.responseId)},'deepseek-flash',${result.usage.input_tokens||0},${result.usage.output_tokens||0},'plan-published','plan',${literal('provider_calls='+result.providerCalls)},CURRENT_TIMESTAMP FROM generation_usage WHERE order_id=${id} HAVING EXISTS (SELECT 1 FROM custom_plan_requests WHERE id=${request} AND status='published' AND result_version=3);`);
      const state=await first(`SELECT status,active_version,confirmed_version FROM custom_plan_orders WHERE order_id=${id}`);
      console.log(JSON.stringify({status:state?.status==='review'&&state.active_version===3?'ready_for_owner_review':'state_changed',version:state?.active_version,confirmed:state?.confirmed_version,calls:previousCalls+result.providerCalls}));
    }
  }
}catch(error){console.log(JSON.stringify({status:'stopped',code:/^(OPERATOR_[A-Z_]+)$/.test(error.code||'')?error.code:'OPERATOR_FAILED'}));process.exitCode=1;}

