// A final-story location cannot be established by the adult explanation or by
// repeating the desired action. It must be present on this checkpoint's player
// sheet. This deliberately checks only concrete locative claims; semantic
// support for other claims is assessed by the independent player-only review.
const general=/^(?:final action|final code|next step|first step|last step|the team|team|players|game|story|mission|repair|result|code|clue|record|page|sheet)$/i;
const tail=/\b(?:and|or|but|because|so|for|with|using|before|after|which|that|where|when|then|by|as|is|are|can|will|must)\b.*$/i;
const location=/\b(?:at|on|in|inside|behind|under|above|beside|from|to)\s+(?:the|a|an)\s+([a-z][a-z'-]*(?:\s+[a-z][a-z'-]*){0,2})/gi;
const normalized=value=>String(value||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();

export function unsupportedLocationClaims(claim,playerText){
  const printed=` ${normalized(playerText)} `,missing=[];
  for(const match of String(claim||'').matchAll(location)){
    const phrase=normalized(match[1].replace(tail,'').replace(/\b(?:the|a|an)$/i,'').trim());
    if(!phrase||general.test(phrase)||phrase.split(' ').every(word=>word.length<4))continue;
    if(!printed.includes(` ${phrase} `)&&!missing.includes(phrase))missing.push(phrase);
  }
  return missing;
}
