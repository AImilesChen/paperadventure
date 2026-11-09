import {unassistedClears} from '../../shared/sudoku/ranking.mjs';
import {SudokuError} from './service.mjs';
function progressConflicts(account,guest){return Object.keys(guest.sessions||{}).filter(id=>{const g=guest.sessions[id],a=account.sessions?.[id];return a&&!a.completed&&!g.completed&&(a.startedAt||a.notes.some(n=>n.length))&&(g.startedAt||g.notes.some(n=>n.length))&&(a.board.join('')!==g.board.join('')||JSON.stringify(a.notes)!==JSON.stringify(g.notes));}).map(id=>{const snapshot=s=>({board:s.board,notes:s.notes,savedAt:s.savedAt,level:s.level});return{id,level:guest.sessions[id].level,guest:snapshot(guest.sessions[id]),account:snapshot(account.sessions[id])};});}
export function mergeConflicts(account,guest){return progressConflicts(account,guest);}
function mergeProgress(account,guest,choices){const a=structuredClone(account);a.seen={...guest.seen,...a.seen};
 for(const[level,c]of Object.entries(guest.completions)){
  a.completions[level]??=structuredClone(c);if(c.assisted)a.completions[level].assisted=true;
 }
 for(const[id,g]of Object.entries(guest.sessions)){const old=a.sessions[id];if(!old){a.sessions[id]=structuredClone(g);continue;}const selected=g.completed&&!old.completed?g:choices[id]==='guest'?g:old,hints=new Map();
  for(const h of[...(old.hints||[]),...(g.hints||[])]){const prev=hints.get(h.board);if(!prev||prev.tier<h.tier)hints.set(h.board,h);}
  a.sessions[id]={...structuredClone(selected),hints:[...hints.values()],revision:Math.max(old.revision,g.revision)+1};
 }
 a.highest=0;while(a.completions[a.highest+1])a.highest++;a.independent=unassistedClears(a);a.current=Math.min(a.highest+1,100);
 return a;
}
export function mergeAccounts(account,guest,guestId,choices={}){const conflicts=mergeConflicts(account,guest);if(conflicts.some(c=>!['guest','account'].includes(choices[c.id])))throw new SudokuError(409,'MERGE_CHOICE_REQUIRED','Choose which unfinished board to keep for each conflicting level.');if(account.imported?.includes(guestId))return structuredClone(account);
 const a=mergeProgress(account,guest,choices);a.imported=[...(account.imported||[]),guestId];a.balance=Math.max(account.balance,guest.balance);
 // Retired boards never block campaign sign-in or rewrite saved historical scores.
 if(Object.keys(guest.weekly||{}).length||Object.keys(guest.retiredWeeklyImports||{}).length){a.retiredWeeklyImports??={};a.retiredWeeklyImports[guestId]={weekly:structuredClone(guest.weekly||{}),imports:structuredClone(guest.retiredWeeklyImports||{})};}
 a.ledger.push({id:'merge-'+guestId,delta:a.balance-account.balance,reason:'Guest progress linked (balances not added)',at:Date.now()});return a;
}
