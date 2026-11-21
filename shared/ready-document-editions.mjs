// Public metadata only; no clue contract in the browser bundle.
export const paidDocumentGame=(world,setting='classroom',variant=null)=>setting==='classroom'&&!variant&&['ocean','museum','library','weather','workshop'].includes(world);
export const readyEnglishRepairGame=world=>['museum','library','weather','workshop'].includes(world);
export function readyDocumentPages(world,locale,version){
 if(world==='ocean')return locale==='zh'?{player:11,guide:19}:{player:9,guide:9};
 if(world==='museum')return locale==='zh'||version==='1.1'?{player:13,guide:19}:{player:11,guide:10};
 if(world==='weather')return locale==='zh'||version==='1.1'?{player:16,guide:19}:{player:12,guide:10};
 if(world==='workshop')return locale==='zh'||version==='1.1'?{player:16,guide:19}:{player:12,guide:10};
 if(world==='library')return locale==='zh'||version==='1.1'?{player:14,guide:19}:{player:11,guide:10};
 return null;
}
export function readyDocumentLabel(world,locale,version,ui='en'){
 const pages=readyDocumentPages(world,locale,version),language=locale==='zh'?'简体中文':'English';
 if(!pages)return language;
 return ui==='zh'?`${language} · ${pages.player}页玩家材料＋${pages.guide}页教师指南`:`${language} · ${pages.player}-page Player Pack + ${pages.guide}-page Teacher Guide`;
}
export function readyDocumentStem(world){if(!paidDocumentGame(world))throw Error('Unsupported document game.');return `${world}-classroom`;}
