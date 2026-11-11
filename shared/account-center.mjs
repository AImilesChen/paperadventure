export const accountSections=Object.freeze([
 {id:'overview',label:'Overview',path:'/en/account/overview/'},
 {id:'games',label:'My games',path:'/en/account/games/'},
 {id:'sudoku',label:'My Sudoku',path:'/en/account/sudoku/'},
 {id:'credits',label:'AI credits',path:'/en/account/credits/'},
 {id:'billing',label:'Orders & billing',path:'/en/account/billing/'},
 {id:'settings',label:'Account settings',path:'/en/account/settings/'},
]);
export function accountSection(path,search='',hash=''){
 if(path==='/en/my-adventures/')return hash==='#my-sudoku'?'sudoku':new URLSearchParams(search).has('support')||new URLSearchParams(search).get('view')==='orders'?'billing':'games';
 return accountSections.find(s=>s.path===path)?.id||null;
}
export const needsAccountAttention=o=>o.product_kind==='custom'&&Boolean(o.paid_at)&&['paid','fulfilling','failed'].includes(o.status);
export function gameSummary(orders=[]){return{ready:orders.filter(o=>o.status==='published').length,pending:orders.filter(needsAccountAttention),unpaid:orders.filter(o=>!o.paid_at&&o.status==='pending_payment'&&!o.checkoutExpired)};}
export function sudokuSummary(progress){if(!progress?.state)return null;const {state}=progress,total=progress.catalog?.publishedCount;
 const started=state.highest>0||Object.keys(state.sessions||{}).length>0;
 return{highest:state.highest,current:state.current,total,started,complete:total>0&&state.highest>=total,label:total>0&&state.highest>=total?'Revisit levels':started?'Continue level '+state.current:'Start level '+state.current};
}
export function accountActivity({orders=[],entries=[]}={}){
 const timestamp=v=>typeof v==='number'?v:Date.parse(v&&(v.endsWith('Z')||/[+-]\d\d:\d\d$/.test(v))?v:(v||'').replace(' ','T')+'Z');
 return [...orders.filter(o=>o.paid_at||o.status==='published').map(o=>({id:'order-'+o.id,title:o.status==='published'?'Adventure purchase: '+(o.title||'Your adventure'):'Game payment confirmed',at:timestamp(o.paid_at||o.created_at),path:'/en/orders/'+encodeURIComponent(o.id)+'/'})),...entries.map(e=>({id:'credit-'+e.id,title:e.reason,detail:(e.delta>0?'+':'')+e.delta+' AI credits',at:timestamp(e.created_at),path:'/en/account/credits/'}))].filter(e=>Number.isFinite(e.at)).sort((a,b)=>b.at-a.at).slice(0,5);
}
