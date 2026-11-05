export const STAGES=['Find the file','Choose your journey','Investigate','Build the evidence','A request','Sort the slips','Confirm the recipient','Choose a handover','Complete the handover','Letter delivered'];
export const normal=v=>String(v??'').toUpperCase().replace(/[^A-Z0-9]/g,'');
export function fresh(){return {version:2,step:0,left:6,route:null,tool:null,helped:null,mode:null,credit:false,assisted:[],setup:{route:null,tool:null,helped:null,mode:null}};}
export function finalPage(s,data){return data.finalPages[s.mode]?.[s.helped?'helped':'ordinary'];}
export function printRecipe(setup,data){
 const pages=new Set([1,2,3,5,6,20]);if(setup.helped!==false)pages.add(4);
 for(const [name,r]of Object.entries(data.routes))if(!setup.route||setup.route===name){for(const tool of Object.keys(data.tools))if(!setup.tool||setup.tool===tool)pages.add(r.toolPages[tool]);pages.add(r.proofPage);}
 for(const mode of ['home','office'])if(!setup.mode||setup.mode===mode)for(const helped of [false,true])if(setup.helped===null||setup.helped===helped)pages.add(data.finalPages[mode][helped?'helped':'ordinary']);
 return [...pages].sort((a,b)=>a-b);
}
export function transition(state,e,data){
 const s=structuredClone(state),fail=message=>({ok:false,state,message}),is=(n,t)=>s.step===n&&e.type===t;
 if(is(0,'SETUP')){
  const q={route:e.route||null,tool:e.tool||null,helped:e.helped??null,mode:e.mode||null};
  if((q.route&&!data.routes[q.route])||(q.tool&&!data.tools[q.tool])||![null,true,false].includes(q.helped)||(q.mode&&!['home','office'].includes(q.mode)))return fail('Choose valid preparation settings.');
  if(q.tool&&!q.route)return fail('Preset a route before presetting a tool.');
  if((q.helped!==null||q.mode)&&(!q.route||!q.tool||q.helped===null||!q.mode))return fail('A fixed run needs route, tool, sorting choice AND final mode.');
  if(q.mode&&6-data.routes[q.route].cost-Number(q.helped)<(q.mode==='home'?2:1))return fail('This fixed run cannot afford personal delivery. Choose collection or a different preset.');
  s.setup=q;return {ok:true,state:s,message:`Preparation saved: ${printRecipe(q,data).length} player sheets. Only printed options will be offered.`};
 }
 if(e.type==='HINT'){if(!s.assisted.includes(s.step))s.assisted.push(s.step);return {ok:true,state:s,message:'Assistance noted; no action spaces lost.'};}
 if(is(0,'OPEN')){if(normal(e.answer)!=='K4')return fail('Match cabinet, date AND accepted status on E-01.');s.step=1;}
 else if(is(1,'PLAN')){if(!data.routes[e.route]||!data.tools[e.tool])return fail('Choose a route and tool.');if((s.setup.route&&e.route!==s.setup.route)||(s.setup.tool&&e.tool!==s.setup.tool))return fail('Choose the options printed for this preset.');s.route=e.route;s.tool=e.tool;s.left-=data.routes[e.route].cost;s.step=2;}
 else if(is(2,'LOCATE')){const r=data.routes[s.route];if(normal(e.answer)!==normal(r.answers[s.tool])||e.source!==r.sources[0])return fail('Check your selected investigation and its source.');s.step=3;}
 else if(is(3,'PROOF')){if(normal(e.number)!=='8'||normal(e.trade)!=='BOAT'||normal(e.emblem)!=='SWALLOW'||e.source!==data.routes[s.route].sources[1])return fail('Trace old number, trade and emblem through your own route records.');s.step=4;}
 else if(is(4,'HELP')){if(typeof e.helped!=='boolean'||(s.setup.helped!==null&&e.helped!==s.setup.helped))return fail('Use the sorting-desk choice printed for this run.');s.helped=e.helped;if(e.helped){s.left--;s.step=5;}else s.step=6;}
 else if(is(5,'SORT')){if(normal(e.answer)!=='213')return fail('Match both names and retain the printed slip order.');s.credit=true;s.step=6;}
 else if(is(6,'IDENTIFY')){if(e.recipient!=='mara'||e.mira!=='emblem'||e.milo!=='trade'||e.mina!=='number'||e.source!==data.routes[s.route].sources[1])return fail('Prove all three old facts and eliminate each other resident with the correct field.');s.step=7;}
 else if(is(7,'DELIVERY')){if(!['home','office'].includes(e.mode)||(s.setup.mode&&e.mode!==s.setup.mode))return fail('Use a delivery mode printed for this run.');if(s.left<(e.mode==='home'?2:1))return fail('Only authorised collection fits the remaining action space.');s.mode=e.mode;s.step=8;}
 else if(is(8,'HANDOVER')){
  const home=s.mode==='home',source=home?(s.helped?'H-02':'H-01'):(s.helped?'O-02':'O-01');
  if(e.register!=='R-01'||e.source!==source)return fail('Use R-01 and the instruction for this exact procedure.');
  if(home){if(normal(e.answer)!=='24A6'||e.path!=='H3')return fail('Check safe path, correct house and personal seal.');if(!s.helped&&(e.rejectH1!=='bridge'||e.rejectH2!=='side'||e.rejectH4!=='house'))return fail('Explain why each other personal-delivery path fails.');}
  else if(normal(e.answer)!=='REEDB7C2'||normal(e.seal)!=='A6'||(!s.helped&&e.authority!=='A1'))return fail('Check current authority, exact collector, seal, bag and counter.');
  if(s.helped&&(!s.credit||e.credit!=='T-01'||e.repair!==(home?'number':'counter')))return fail('Show earned T-01 and identify the repaired draft field.');
  s.left-=home?2:1;s.step=9;
 }
 else return fail('That action is not available at this checkpoint.');
 if(s.left<0)throw Error('Negative action budget');return {ok:true,state:s,message:s.step===9?'Handover verified. Complete receipt 6 and read ending 20.':'Checked. Receive the next named sheet.'};
}
export function correctEvent(s,data){const r=data.routes[s.route];return [
 {type:'OPEN',answer:'K4'},{type:'PLAN',route:s.setup.route||'dock',tool:s.setup.tool||'folder'},
 {type:'LOCATE',answer:r?.answers[s.tool],source:r?.sources[0]},
 {type:'PROOF',number:'8',trade:'BOAT',emblem:'SWALLOW',source:r?.sources[1]},
 {type:'HELP',helped:s.setup.helped??false},{type:'SORT',answer:'213'},
 {type:'IDENTIFY',recipient:'mara',mira:'emblem',milo:'trade',mina:'number',source:r?.sources[1]},
 {type:'DELIVERY',mode:s.setup.mode||'office'},
 {type:'HANDOVER',answer:s.mode==='home'?'24-A6':'REED-B7-C2',path:'H3',seal:'A6',authority:'A1',register:'R-01',source:s.mode==='home'?(s.helped?'H-02':'H-01'):(s.helped?'O-02':'O-01'),credit:'T-01',repair:s.mode==='home'?'number':'counter',rejectH1:'bridge',rejectH2:'side',rejectH4:'house'}][s.step];}
export function saveState(s){return JSON.stringify({version:2,step:s.step,route:s.route,tool:s.tool,helped:s.helped,mode:s.mode,setup:s.setup,assisted:s.assisted});}
export function restoreState(raw,data){try{const q=JSON.parse(raw);if(q.version!==2||!Number.isInteger(q.step)||q.step<0||q.step>9)return fresh();let s=fresh(),res=transition(s,{type:'SETUP',...q.setup},data);if(!res.ok)return fresh();s=res.state;while(s.step<q.step){let e=correctEvent(s,data);if(s.step===1)e={type:'PLAN',route:q.route,tool:q.tool};if(s.step===4)e={type:'HELP',helped:q.helped};if(s.step===7)e={type:'DELIVERY',mode:q.mode};res=transition(s,e,data);if(!res.ok||res.state.step>q.step)return fresh();s=res.state;}s.assisted=Array.isArray(q.assisted)?[...new Set(q.assisted.filter(n=>Number.isInteger(n)&&n>=0&&n<=s.step))]:[];return s;}catch{return fresh();}}
