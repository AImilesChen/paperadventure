import {normalizeDraft,fromCloudDraft} from './creatorDraft.mjs';

// Ignore navigation step and string/number controls; compare every actual choice.
function comparable(value) {
  const {step,...draft}=normalizeDraft(value);
  return JSON.stringify({...draft,players:String(draft.players),groups:String(draft.groups)});
}
export function matchesRemovedDraft(local,removed=[]) {
  return Boolean(local?.idea||local?.customIdea||local?.theme||local?.themeId)&&removed.some(spec=>comparable(local)===comparable(fromCloudDraft(spec)));
}
export function clearRemovedLocalDraft(storage,removed) {
  try {
    const saved=JSON.parse(storage.getItem('paw-draft')||'null');
    if(matchesRemovedDraft(saved,removed)){storage.removeItem('paw-draft');return true;}
  }catch{}
  return false;
}
