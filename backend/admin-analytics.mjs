import {ApiError} from './domain.mjs';

// This private adapter reads the existing CF Web Analytics site only; no collection.
export const analyticsSource=Object.freeze({account:'77bc392d46985cd3425691358f5e8a77',siteTag:'5af3291a59604376a2e07b572175a6e3',host:'paperadventure.app'});
const endpoint='https://api.cloudflare.com/client/v4/graphql';
const cache=new WeakMap();
const specs={summary:{limit:1},trend:{dimension:'date',limit:30,order:'date_ASC'},countries:{dimension:'countryName',limit:10,order:'sum_visits_DESC'},sources:{dimension:'refererHost',limit:10,order:'sum_visits_DESC'},pages:{dimension:'requestPath',limit:10,order:'count_DESC'},devices:{dimension:'deviceType',limit:10,order:'sum_visits_DESC'}};
const fail=code=>Object.assign(new Error(code),{code});
function numeric(value){if(typeof value!=='number'||!Number.isFinite(value)||value<0||value>Number.MAX_SAFE_INTEGER)throw fail('format');return value;}
function reason(errors){const text=errors.map(e=>e?.message||'').join(' ');return /auth|permission|access|not authorized/i.test(text)?'permission':/budget|rate.limit|quota/i.test(text)?'quota':/limit|older|duration/i.test(text)?'range':'upstream';}
function normalized(rows,spec){
 if(!Array.isArray(rows)||rows.length>spec.limit)throw fail('format');
 let sampled=false;
 const values=rows.map(row=>{
  const pageViews=numeric(row?.count),visits=numeric(row?.sum?.visits);
  if(row.avg?.sampleInterval!==undefined&&numeric(row.avg.sampleInterval)>1)sampled=true;
  if(!spec.dimension)return {pageViews,visits};
  let label=row.dimensions?.[spec.dimension];if(typeof label!=='string'||label.length>2048)throw fail('format');
  if(spec.dimension==='date'&&!/^\d{4}-\d{2}-\d{2}$/.test(label))throw fail('format');
  // Keep only public route-shaped paths; never return arbitrary query strings or identifiers.
  if(spec.dimension==='requestPath'&&!/^\/en\/(?:[a-z0-9-]+\/)*$/.test(label))label='其他页面';
  if(spec.dimension==='requestPath'&&/^\/en\/(?:account|orders|my-adventures|checkout|create|credits)(?:\/|$)/.test(label))label='私密页面';
  return {label,pageViews,visits};
 });
 return {status:'ready',sampled,...(spec.dimension?{items:values}:{values:values[0]||{pageViews:0,visits:0}})};
}
function reportQuery(since,until){
 const filter=`{siteTag:${JSON.stringify(analyticsSource.siteTag)},requestHost:${JSON.stringify(analyticsSource.host)},bot:0,datetime_geq:${JSON.stringify(since)},datetime_lt:${JSON.stringify(until)}}`;
 const aliases=Object.entries(specs).map(([name,s])=>`${name}:rumPageloadEventsAdaptiveGroups(limit:${s.limit},filter:${filter}${s.order?',orderBy:['+s.order+']':''}){count sum{visits} avg{sampleInterval}${s.dimension?' dimensions{'+s.dimension+'}':''}}`).join('\n');
 return `{viewer{accounts(filter:{accountTag:${JSON.stringify(analyticsSource.account)}}){${aliases}}}}`;
}
async function getReport(env,secret,since,until){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
 try{
  const response=await (env.FETCH||fetch)(endpoint,{method:'POST',redirect:'error',signal:controller.signal,headers:{authorization:'Bearer '+secret,'content-type':'application/json'},body:JSON.stringify({query:reportQuery(since,until)})});
  if(!response.ok)throw fail([401,403].includes(response.status)?'permission':response.status===429?'quota':'upstream');
  const body=await response.json();
  if(!body||typeof body!=='object'||body.errors!=null&&!Array.isArray(body.errors))throw fail('format');
  const accounts=body.data?.viewer?.accounts;
  if(!Array.isArray(accounts)||accounts.length!==1||!accounts[0])throw fail(body.errors?.length?reason(body.errors):'format');
  const sections={};
  for(const [name,spec] of Object.entries(specs)){
   const relevant=(body.errors||[]).filter(e=>!Array.isArray(e?.path)||!e.path.some(p=>Object.hasOwn(specs,p))||e.path.includes(name));
   try{if(relevant.length)throw fail(reason(relevant));sections[name]=normalized(accounts[0][name],spec);}catch(e){sections[name]={status:'error',reason:e.code||'format'};}
  }
  return sections;
 }catch(e){throw fail(['permission','quota','range','format','upstream'].includes(e.code)?e.code:controller.signal.aborted?'timeout':'upstream');}
 finally{clearTimeout(timer);}
}
export async function adminAnalytics(env,params){
 const input=params.get('days')||'1',range=params.get('range');
 if(!['1','7','30'].includes(input)||range&&range!=='24h')throw new ApiError(400,'ADMIN_ANALYTICS_RANGE','请选择今天、近 7 天或近 30 天。');
 const days=Number(input);if(range==='24h'&&days!==1)throw new ApiError(400,'ADMIN_ANALYTICS_RANGE','日期范围不正确。');
 const now=new Date(),start=range==='24h'?new Date(+now-86400000):new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate()-(days-1)));
 const base={provider:'cloudflare',site:analyticsSource.host,days,range:range||'calendar',timeZone:'UTC',since:start.toISOString(),until:now.toISOString(),cacheSeconds:60};
 const secret=typeof env.CF_ANALYTICS_API_TOKEN==='string'?env.CF_ANALYTICS_API_TOKEN.trim():'';
 if(!secret)return {...base,status:'not_configured'};
 if(!/^[A-Za-z0-9_-]{32,500}$/.test(secret))return {...base,status:'error',reason:'configuration'};
 let state=cache.get(env);if(!state||state.secret!==secret){state={secret,reports:new Map()};cache.set(env,state);}
 const key=String(days)+(range||'calendar')+start.toISOString().slice(0,10),old=state.reports.get(key);
 if(old?.promise)return old.promise;
 if(old?.until>Date.now())return {...old.data,cached:true};
 if(state.reports.size>=4)state.reports.delete(state.reports.keys().next().value);
 const promise=(async()=>{
  let data;
  try{
   const sections=await getReport(env,secret,base.since,base.until),good=Object.values(sections).filter(s=>s.status==='ready').length;
   data={...base,sections,status:good===6?'ready':good?'partial':'error',reason:good?undefined:sections.summary.reason,sampled:Object.values(sections).some(s=>s.sampled),updatedAt:new Date().toISOString()};
  }catch(e){data={...base,status:'error',reason:e.code||'upstream'};}
  state.reports.set(key,{data,until:Date.now()+(data.status==='ready'?60000:10000)});return data;
 })();
 state.reports.set(key,{promise});return promise;
}
