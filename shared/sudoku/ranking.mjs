// `independent` remains the API field name for backwards-compatible clients.
// Its value is now cumulative, based solely on recorded first clears.
export function unassistedClears(account){
 return Object.entries(account?.completions||{}).filter(([level,c])=>Number.isInteger(Number(level))&&Number(level)>=1&&Number(level)<=Math.min(account.highest,100)&&c.assisted===false).length;
}
export function rankingStatus(account,mode){
 if(!account?.verified)return 'guest';
 if(!account.listed)return 'private';
 if(!account.state.highest)return 'no_clears';
 if(mode==='independent'&&!unassistedClears(account.state))return 'no_unassisted';
 return 'ranked';
}
