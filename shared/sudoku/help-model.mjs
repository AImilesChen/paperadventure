export const sudokuHelpVersion=2;
export const helpPrices=Object.freeze({reasoning:1,answer:3});
export const hintAccess=tier=>Number(tier)>=2?'answer':Number(tier)>=1?'reasoning':null;
export const hintValue=tier=>hintAccess(tier)==='answer'?3:hintAccess(tier)==='reasoning'?1:0;
export const helpCost=(mode,tier=0)=>Math.max(0,helpPrices[mode]-hintValue(tier));
export function helpQuote(board,hints=[]){const owned=hints.find(h=>h.board===board);return{version:sudokuHelpVersion,board,access:hintAccess(owned?.tier),hintId:owned?.id||null,costs:{reasoning:helpCost('reasoning',owned?.tier),answer:helpCost('answer',owned?.tier)}};}
