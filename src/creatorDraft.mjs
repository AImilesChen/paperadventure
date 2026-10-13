import { contextKey, storySuggestions, validatePlan, mechanicById } from '../shared/creator-plan.mjs';
import { themes } from '../shared/catalog.mjs';
export function draftSpec(draft) {
  return {creatorVersion:3,themeId:null,customIdea:draft.idea,setting:draft.setting,players:draft.players,groups:draft.groups,age:draft.age,paper:draft.paper,place:draft.place,reading:draft.reading,materials:draft.materials,preferences:draft.preferences,storyLocation:draft.storyLocation,mood:draft.mood,language:'en',gameplay:draft.gameplay};
}
export function normalizeDraft(saved = {}) {
  const string=value=>typeof value==='string'?value:'';
  const primary=mechanicById(saved.gameplay?.primary)?saved.gameplay.primary:'reasoning';
  const secondary=Array.isArray(saved.gameplay?.secondary)?[...new Set(saved.gameplay.secondary.filter(id=>id!==primary&&mechanicById(id)))].slice(0,2):['discussion'].filter(id=>id!==primary);
  const theme=themes.find(item=>item.id===(saved.theme || saved.themeId));
  return {creatorVersion:3,custom:true,theme:'',idea:string(saved.idea)||string(saved.customIdea)||(theme?`A new adventure about ${theme.title}`:''),setting:saved.setting==='classroom'?'classroom':'home',players:['string','number'].includes(typeof saved.players)?saved.players:'',groups:['string','number'].includes(typeof saved.groups)?saved.groups:'',age:string(saved.age),paper:saved.paper==='Letter'?'Letter':'A4',place:string(saved.place),reading:string(saved.reading),materials:string(saved.materials),preferences:Object.fromEntries(['characters','goal','include','avoid'].map(name=>[name,string(saved.preferences?.[name])])),storyLocation:string(saved.storyLocation),mood:string(saved.mood),gameplay:{primary,secondary,request:string(saved.gameplay?.request)},step:Math.min(5,Math.max(1,Number(saved.step)||1))};
}
export function fromCloudDraft(spec) {
  return normalizeDraft({...spec,idea:spec.customIdea || '',step:1});
}
export function activePlans(draft) {
  if (!draft.cache || draft.cache.key!==contextKey(draftSpec(draft))) return [];
  try { return draft.cache.proposals.map(item=>({...validatePlan(item,draftSpec(draft)),previewToken:item.previewToken})); } catch { return []; }
}
export function readySetup(draft) {
  const players = Number(draft.players), groups = Number(draft.groups);
  const age = /^([6-9]|1[0-2])(?:\s*[-–]\s*([6-9]|1[0-2]))?$/.exec(String(draft.age).trim());
  return !!draft.idea.trim() && draft.idea.trim().length<=400 && Number.isInteger(players) && players>=2 && players<=(draft.setting==='classroom'?35:12) && !!age && (!age[2] || Number(age[2])>=Number(age[1])) && (draft.setting!=='classroom' || Number.isInteger(groups) && groups>=1 && groups<=Math.min(players,10));
}
export function recommendedSetup(idea) {
  const profile=storySuggestions(idea);
  return {characters:profile.characters[0],goal:profile.goal[0],storyLocation:profile.location[0],mood:'Gentle mystery'};
}
