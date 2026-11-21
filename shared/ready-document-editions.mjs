// Public metadata only; no clue contract in the browser bundle.
export const paidDocumentGame=(world,setting='classroom',variant=null)=>!variant&&((setting==='classroom'&&['ocean','museum','library','weather','workshop'].includes(world))||(world==='dinosaur'&&setting==='home'));
export const readyEnglishRepairGame=(world,setting='classroom')=>(setting==='classroom'&&['museum','library','weather','workshop'].includes(world))||(world==='dinosaur'&&setting==='home');
export function readyDocumentPages(world,locale,version,setting='classroom'){
 if(world==='dinosaur'&&setting==='home')return locale==='zh'||version==='1.1'?{player:17,guide:18}:{player:15,guide:10};
 if(setting!=='classroom')return null;
 if(world==='ocean')return locale==='zh'?{player:11,guide:19}:{player:9,guide:9};
 if(world==='museum')return locale==='zh'||version==='1.1'?{player:13,guide:19}:{player:11,guide:10};
 if(world==='weather')return locale==='zh'||version==='1.1'?{player:16,guide:19}:{player:12,guide:10};
 if(world==='workshop')return locale==='zh'||version==='1.1'?{player:16,guide:19}:{player:12,guide:10};
 if(world==='library')return locale==='zh'||version==='1.1'?{player:14,guide:19}:{player:11,guide:10};
 return null;
}
export function readyDocumentLabel(world,locale,version,ui='en',setting='classroom'){
 const pages=readyDocumentPages(world,locale,version,setting),language=locale==='zh'?'简体中文':'English';
 if(!pages)return language;
 return ui==='zh'?`${language} · ${pages.player}页玩家材料＋${pages.guide}页${setting==='home'?'主持':'教师'}指南`:`${language} · ${pages.player}-page Player Pack + ${pages.guide}-page ${setting==='home'?'Host':'Teacher'} Guide`;
}
export function readyDocumentStem(world,setting='classroom'){if(!paidDocumentGame(world,setting))throw Error('Unsupported document game.');return `${world}-${setting}`;}
