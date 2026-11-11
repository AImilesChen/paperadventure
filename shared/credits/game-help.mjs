import {freePuzzles} from '../free-puzzles.mjs';
import {cleanData,checkWorkshop} from '../puzzle-workshop.mjs';
import {stampEdition} from '../stamp-investigation.mjs';
import {moonEdition} from '../moon-signal.mjs';
import {bayEdition,bayHints,baySolution} from '../loading-bay.mjs';
import {parcelEdition} from '../parcel-evidence.mjs';
import {forestEdition,forestHints} from '../forest-loop.mjs';
import {lightEdition,lightHints} from '../harbour-lights.mjs';
export const helpTotals=Object.freeze({'hint-1':0,'hint-2':1,'hint-3':3,solution:5});
const editions={'stamp-code':stampEdition,'signal-shift':moonEdition,'parcel-queue':bayEdition,'shared-parcel':parcelEdition,'forest-trail':forestEdition,'harbour-route':lightEdition};
export function gameHelpContext(input={}){
 const puzzle=freePuzzles.find(p=>p.id===input.game);if(!puzzle||!Object.hasOwn(helpTotals,input.kind))return null;
 const data=cleanData(input.game,input.data),edition=editions[input.game],key=input.game+'@'+edition;
 let hints=puzzle.hints,solution=puzzle.solution;
 if(input.game==='stamp-code'&&data.verified)hints=puzzle.routeHints;
 if(input.game==='parcel-queue'){hints=bayHints(data.positions);solution=baySolution(data.positions);}
 if(input.game==='forest-trail')hints=forestHints(data);
 if(input.game==='harbour-route')hints=lightHints(data);
 return{game:puzzle.id,title:puzzle.title,edition,key,data,hints,solution,answer:puzzle.answer,completed:checkWorkshop(puzzle.id,data).ok===true};
}
export function helpQuote(state,context,kind){
 const unlocked=state.aiCreditUnlocks?.[context.key]||[],total=helpTotals[kind],earned=context.completed&&kind==='solution',owned=unlocked.includes(kind)||unlocked.includes('solution'),spent=state.aiCreditSpent?.[context.key]||0;
 const cost=owned||earned?0:Math.max(0,total-spent);
 return{game:context.game,edition:context.edition,kind,owned,earned,cost,spent,total,balance:state.balance,remaining:state.balance-cost,affordable:state.balance>=cost};
}
export function applyHelpUnlock(state,context,kind,requestId,at){
 const quote=helpQuote(state,context,kind);if(!quote.affordable)return null;const next=structuredClone(state);
 next.aiCreditUnlocks??={};next.aiCreditSpent??={};
 const kinds=Object.keys(helpTotals).filter(k=>helpTotals[k]<=helpTotals[kind]);
 next.aiCreditUnlocks[context.key]=[...new Set([...(next.aiCreditUnlocks[context.key]||[]),...kinds])];
 next.aiCreditSpent[context.key]=(next.aiCreditSpent[context.key]||0)+quote.cost;
 const free=next.balance-(next.paidBalance||0);next.paidBalance=Math.max(0,(next.paidBalance||0)-Math.max(0,quote.cost-free));next.balance-=quote.cost;
 next.lastAiCreditRequest=requestId;next.ledger.push({id:'credit-help:'+requestId,delta:-quote.cost,kind:'game_help',reason:context.title+' · '+(kind==='solution'?'Explained answer':kind.replace('-',' ')),game:context.game,at});
 return{state:next,quote};
}
