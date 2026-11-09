import bank from './weekly-puzzles.json' with {type:'json'};
import {applyAction,publicState,SudokuError} from './service.mjs';
import {weekId,weekWindow,freshWeek,weeklyScores} from '../../shared/sudoku/weekly.mjs';
export const weeklyBank=bank.weeks;
export function getWeek(id,now=Date.now()){
 const period=weekWindow(id,now),entry=weeklyBank.find(w=>w.id===id);
 if(!period||!entry||period.status==='upcoming')throw new SudokuError(404,'WEEK_UNAVAILABLE','This weekly challenge is not available. Choose an open or past week.');
 return{...period,puzzles:entry.puzzles};
}
export function weekInfo(week){const{id,start,end,status}=week;return{id,start,end,status,total:10};}
export function weekProgress(account,id){return account.weekly?.[id]||freshWeek();}
export function weeklyPublicState(account,id){return{...publicState({...account,...weekProgress(account,id)}),weekId:id};}
export function weeklyOverview(account,id,now=Date.now()){
 const current=weekId(now),selected=id||current,entry=weeklyBank.find(w=>w.id===selected),week=entry?getWeek(selected,now):null;
 if(id&&!week)throw new SudokuError(404,'WEEK_UNAVAILABLE','This weekly challenge is not available.');
 const history=weeklyBank.filter(w=>weekWindow(w.id,now).status==='closed').map(w=>{const period=weekWindow(w.id,now),p=weekProgress(account,w.id),score=p.ranked||weeklyScores(p,period);return{...weekInfo(period),cleared:p.highest,scored:score.highest||0,hintFree:score.independent||0,complete:p.highest===10};}).reverse();
 return{currentWeek:current,week:week?weekInfo(week):null,state:week?weeklyPublicState(account,selected):null,catalog:week?.puzzles.map(({level,rank})=>({level,rank}))||[],history,serverNow:now};
}
// Materialize public scores only while a period is open. Later practice, login,
// or imports cannot retroactively increase a closed week's public scores.
export function syncWeeklyScores(account,verified,listed,now=Date.now()){
 if(!verified||!listed)return account;
 const id=weekId(now),p=account.weekly?.[id],period=weekWindow(id,now);
 if(!p||!weeklyBank.some(w=>w.id===id))return account;
 const score=weeklyScores(p,period);p.ranked={...score,joinedAt:p.ranked?.joinedAt??now};return account;
}
export function weeklyPersonal(account,period){
 const p=weekProgress(account.state,period.id),score=period.status==='closed'?(p.ranked||weeklyScores(p,period)):weeklyScores(p,period);
 const status=!account.verified?'guest':!account.listed?'private':period.status==='closed'&&!p.ranked?'closed_entry':!score.highest?'no_clears':'ranked';
 return{highest:score.highest||0,unassisted:score.independent||0,practiceHighest:p.highest||0,status};
}
export function applyWeeklyAction(account,id,action,input,now=Date.now()){
 const week=getWeek(id,now),p=weekProgress(account,id),scoped={...account,...p};
 const r=applyAction(scoped,action,input,now,{bank:week.puzzles,reward:week.status==='active'?2:0});
 const next=structuredClone(account),a=r.account;
 next.balance=a.balance;next.ledger=a.ledger.map((entry,i)=>i>=account.ledger.length?{...entry,weekId:id,reason:'Week '+id+' · '+entry.reason}:entry);next.weekly??={};
 next.weekly[id]={...p,highest:a.highest,independent:a.independent,current:a.current,sessions:a.sessions,completions:a.completions,seen:a.seen};
 return{account:next,result:{...r.result,state:weeklyPublicState(next,id),week:weekInfo(week),rewardGranted:Math.max(0,next.balance-account.balance)}};
}
