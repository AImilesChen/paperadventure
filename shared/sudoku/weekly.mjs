export const WEEK_MS=7*24*60*60*1000;
export const WEEK_SIZE=10;
export function weekId(now=Date.now()){
 const date=new Date(now);date.setUTCHours(0,0,0,0);date.setUTCDate(date.getUTCDate()-((date.getUTCDay()+6)%7));return date.toISOString().slice(0,10);
}
export function weekWindow(id,now=Date.now()){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(id||''))return null;
 const start=Date.parse(id+'T00:00:00Z');if(!Number.isFinite(start)||weekId(start)!==id)return null;
 const end=start+WEEK_MS;return{id,start,end,status:now<start?'upcoming':now>=end?'closed':'active'};
}
export function weeklyScores(progress,period){
 const clears=Object.values(progress?.completions||{}).filter(c=>Number.isFinite(c.at)&&c.at>=period.start&&c.at<period.end);
 return{highest:clears.length,independent:clears.filter(c=>c.assisted===false).length};
}
export function freshWeek(){return{highest:0,independent:0,current:1,sessions:{},completions:{},seen:{}};}
