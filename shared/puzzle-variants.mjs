// Finite, versioned formats. Selection uses only immutable purchase settings,
// never fresh randomness during plan edits, queue retries or PDF rebuilds.
export const puzzleVariants={
  evidence_cards:['evidence-match','evidence-crosscheck'],
  order_tiles:['order-links','order-positions'],
  symbol_key:['code-numbers','code-shapes'],
  route_board:['route-links','route-conditions'],
  decision_record:['witness-properties','witness-exclusions'],
};
export const shapeSymbols=['CIRCLE','SQUARE','TRIANGLE','STAR'];
export const witnessTeamwork='Reader shares clue 1; Checker shares clue 2. Keep the other clue covered, then combine both facts. Recorder checks the choice.';
export function stablePuzzleSeed(value){
  let hash=2166136261;
  for(const char of String(value))hash=Math.imul(hash^char.charCodeAt(0),16777619)>>>0;
  return hash;
}
export function puzzlePolicy(spec){
  if(spec?.packPlayAllocationVersion!==1||spec?.packPuzzleVariantVersion!==1)return null;
  const seed=stablePuzzleSeed(JSON.stringify({idea:spec.customIdea||spec.themeId||'',setting:spec.setting,
    players:Number(spec.players),groups:spec.setting==='classroom'?Number(spec.groups):null,age:spec.age,
    storyLocation:spec.storyLocation||'',mood:spec.mood||'',reading:spec.reading||'',preferences:spec.preferences||{},
    primary:spec.gameplay?.primary||'reasoning',secondary:[...(spec.gameplay?.secondary||[])].sort(),request:spec.gameplay?.request||''}));
  return {puzzleVariantVersion:1,puzzleSeed:seed};
}
export function selectPuzzleVariants(types,seed){
  const seen={};
  return types.map((type,index)=>{
    if(index===4)return 'finale-code';
    const variants=puzzleVariants[type],occurrence=seen[type]||0;seen[type]=occurrence+1;
    return variants[(stablePuzzleSeed(`${seed}:${type}`)+occurrence)%variants.length];
  });
}
