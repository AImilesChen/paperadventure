import {unassistedClears} from '../../shared/sudoku/ranking.mjs';
import {freshWeek} from '../../shared/sudoku/weekly.mjs';
import {SudokuError} from './service.mjs';
function progressConflicts(account,guest,weekId){return Object.keys(guest.sessions||{}).filter(id=>{const g=guest.sessions[id],a=account.sessions?.[id];return a&&!a.completed&&!g.completed&&(a.startedAt||a.notes.some(n=>n.length))&&(g.startedAt||g.notes.some(n=>n.length))&&(a.board.join('')!==g.board.join('')||JSON.stringify(a.notes)!==JSON.stringify(g.notes));}).map(id=>{const snapshot=s=>({board:s.board,notes:s.notes,savedAt:s.savedAt,level:s.level});return{id,weekId,level:guest.sessions[id].level,guest:snapshot(guest.sessions[id]),account:snapshot(account.sessions[id])};});}
export function mergeConflicts(account,guest){return[...progressConflicts(account,guest),...Object.keys(guest.weekly||{}).flatMap(id=>progressConflicts(account.weekly?.[id]||freshWeek(),guest.weekly[id],id))];}
function mergeProgress(account,guest,choices,weekly=false){const a=structuredClone(account);a.seen={...guest.seen,...a.seen};
 for(const[level,c]of Object.entries(guest.completions)){
  if(weekly){const old=a.completions[level];if(!old||c.at<old.at)a.completions[level]=structuredClone(c);else if(c.at===old.at&&c.assisted)old.assisted=true;}
  else{a.completions[level]??=structuredClone(c);if(c.assisted)a.completions[level].assisted=true;}
 }
 for(const[id,g]of Object.entries(guest.sessions)){const old=a.sessions[id];if(!old){a.sessions[id]=structuredClone(g);continue;}const selected=g.completed&&!old.completed?g:choices[id]==='guest'?g:old,hints=new Map();
  for(const h of[...(old.hints||[]),...(g.hints||[])]){const prev=hints.get(h.board);if(!prev||prev.tier<h.tier)hints.set(h.board,h);}
  a.sessions[id]={...structuredClone(selected),hints:[...hints.values()],revision:Math.max(old.revision,g.revision)+1};
 }
 a.highest=0;while(a.completions[a.highest+1])a.highest++;a.independent=unassistedClears(a);a.current=Math.min(a.highest+1,weekly?10:100);
 // Only the receiving account's previously recorded public snapshot survives.
 if(weekly){if(account.ranked)a.ranked=structuredClone(account.ranked);else delete a.ranked;}
 return a;
}
export function mergeAccounts(account,guest,guestId,choices={}){const conflicts=mergeConflicts(account,guest);if(conflicts.some(c=>!['guest','account'].includes(choices[c.id])))throw new SudokuError(409,'MERGE_CHOICE_REQUIRED','Choose which unfinished board to keep for each conflicting level.');if(account.imported?.includes(guestId))return structuredClone(account);
 const a=mergeProgress(account,guest,choices);a.imported=[...(account.imported||[]),guestId];a.balance=Math.max(account.balance,guest.balance);a.weekly??={};
 for(const[id,g]of Object.entries(guest.weekly||{}))a.weekly[id]=mergeProgress(account.weekly?.[id]||freshWeek(),g,choices,true);
 a.ledger.push({id:'merge-'+guestId,delta:a.balance-account.balance,reason:'Guest progress linked (balances not added)',at:Date.now()});return a;
}
