import test from 'node:test';
import assert from 'node:assert/strict';
import {adminAnalytics,analyticsSource} from './admin-analytics.mjs';
const secret='cfat_local_only_fixture_123456789012345678901234567890';
const query=value=>new URLSearchParams(value);
const names=['summary','trend','countries','sources','pages','devices'];
function fixture({zero=false,broken=null,errors=null,status=200}={}){
 const calls=[],env={CF_ANALYTICS_API_TOKEN:secret,FETCH:async(url,options)=>{
  calls.push({url,options});
  const values={summary:[{count:14,sum:{visits:9},avg:{sampleInterval:1}}],trend:[{count:14,sum:{visits:9},dimensions:{date:'2026-11-12'}}],countries:[{count:7,sum:{visits:4},dimensions:{countryName:'US'}}],sources:[{count:7,sum:{visits:4},dimensions:{refererHost:''}}],pages:[{count:7,sum:{visits:4},dimensions:{requestPath:'/en/'}}],devices:[{count:7,sum:{visits:4},dimensions:{deviceType:'desktop'}}]};
  if(zero)for(const name of names)values[name]=[];
  if(broken)values[broken]=null;
  return Response.json({data:{viewer:{accounts:[values]}},errors},{status});
 }};return {env,calls};
}
test('missing configuration is honest; invalid secrets/ranges never contact upstream',async()=>{
 const f=fixture();delete f.env.CF_ANALYTICS_API_TOKEN;assert.equal((await adminAnalytics(f.env,query('days=1'))).status,'not_configured');assert.equal(f.calls.length,0);
 f.env.CF_ANALYTICS_API_TOKEN='bad\ncredential';assert.equal((await adminAnalytics(f.env,query('days=1'))).reason,'configuration');
 for(const value of ['days=2','days=365','days=1&range=unknown','days=7&range=24h'])await assert.rejects(adminAnalytics(f.env,query(value)),e=>e.status===400);
 assert.equal(f.calls.length,0);
});
test('one readonly query fixes account, host, site, bot exclusion and UTC period; no credentials are returned',async()=>{
 const f=fixture(),b=await adminAnalytics(f.env,query('days=1'));assert.equal(b.status,'ready');assert.equal(b.provider,'cloudflare');assert.equal(b.timeZone,'UTC');assert.deepEqual(b.sections.summary.values,{pageViews:14,visits:9});assert.equal(f.calls.length,1);
 const c=f.calls[0],q=JSON.parse(c.options.body).query;assert.equal(c.url,'https://api.cloudflare.com/client/v4/graphql');assert.equal(c.options.method,'POST');assert.equal(c.options.redirect,'error');assert.equal(c.options.headers.authorization,'Bearer '+secret);assert.ok(!q.includes('mutation'));
 for(const name of names)assert.ok(q.includes(name+':rumPageloadEventsAdaptiveGroups'));
 for(const value of [analyticsSource.account,analyticsSource.host,analyticsSource.siteTag,'bot:0'])assert.ok(q.includes(value));
 assert.match(b.since,/T00:00:00\.000Z$/);assert.ok(!JSON.stringify(b).includes(secret));assert.ok(!JSON.stringify(b).includes('CF_ANALYTICS_API_TOKEN'));
});
test('single-flight caching deduplicates refresh, keeps ranges separate and resets on credential rotation',async()=>{
 const f=fixture();await Promise.all(Array.from({length:8},()=>adminAnalytics(f.env,query('days=1'))));assert.equal(f.calls.length,1);
 assert.equal((await adminAnalytics(f.env,query('days=1'))).cached,true);
 for(const value of ['days=7','days=30','days=1&range=24h'])assert.equal((await adminAnalytics(f.env,query(value))).status,'ready');assert.equal(f.calls.length,4);
 f.env.CF_ANALYTICS_API_TOKEN=secret+'changed';await adminAnalytics(f.env,query('days=1'));assert.equal(f.calls.length,5);
});
test('rolling24h is separate from today; 7 and30 days include today at UTC midnight',async()=>{
 const f=fixture(),a=await adminAnalytics(f.env,query('days=1&range=24h'));assert.equal(Date.parse(a.until)-Date.parse(a.since),86400000);
 for(const d of [7,30]){const b=await adminAnalytics(f.env,query('days='+d)),midnight=new Date(b.until);midnight.setUTCHours(0,0,0,0);assert.equal(+midnight-Date.parse(b.since),(d-1)*86400000);}
});
test('empty reports are zero; missing or invalid reports are errors with partial data preserved',async()=>{
 const f=fixture({zero:true}),b=await adminAnalytics(f.env,query('days=1'));assert.equal(b.status,'ready');assert.deepEqual(b.sections.summary.values,{pageViews:0,visits:0});assert.deepEqual(b.sections.countries.items,[]);
 const bad=fixture({broken:'summary'}),p=await adminAnalytics(bad.env,query('days=1'));assert.equal(p.status,'partial');assert.equal(p.sections.summary.reason,'format');assert.equal(p.sections.summary.values,undefined);assert.equal(p.sections.countries.status,'ready');
});
test('GraphQL partial errors attach to the correct section and raw errors/secrets never leak',async()=>{
 const f=fixture({broken:'countries',errors:[{message:'permission denied; private trace '+secret,path:['viewer','accounts',0,'countries']}]}),b=await adminAnalytics(f.env,query('days=1'));
 assert.equal(b.status,'partial');assert.equal(b.sections.countries.reason,'permission');assert.equal(b.sections.summary.status,'ready');assert.ok(!JSON.stringify(b).includes(secret));
});
test('HTTP auth/quota failures and network errors never become zero visits',async()=>{
 for(const [status,reason] of [[403,'permission'],[429,'quota'],[500,'upstream']]){const f=fixture({status}),b=await adminAnalytics(f.env,query('days=1'));assert.equal(b.status,'error');assert.equal(b.reason,reason);assert.equal(b.sections,undefined);}
 const f=fixture();f.env.FETCH=async()=>{throw Error(secret);};const b=await adminAnalytics(f.env,query('days=1'));assert.equal(b.reason,'upstream');assert.ok(!JSON.stringify(b).includes(secret));
});
test('unsafe paths, malformed counters and provider sampling stay explicit',async()=>{
 const f=fixture(),original=f.env.FETCH;f.env.FETCH=async(...args)=>{const r=await original(...args),b=await r.json(),a=b.data.viewer.accounts[0];a.pages[0].dimensions.requestPath='/en/account/?email=private@example.test';a.summary[0].avg.sampleInterval=2;a.devices[0].count=-1;return Response.json(b);};
 const b=await adminAnalytics(f.env,query('days=1'));assert.equal(b.sections.pages.items[0].label,'其他页面');assert.equal(b.sampled,true);assert.equal(b.sections.devices.reason,'format');assert.ok(!JSON.stringify(b).includes('private@example.test'));
});
