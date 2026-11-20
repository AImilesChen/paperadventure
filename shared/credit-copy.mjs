import {uiText} from './ui-locale.mjs';
export function creditReason(reason){
 if(typeof reason!=='string')return reason;
 let match=reason.match(/^Level (\d+) (complete|next-cell answer|thinking hint)$/);
 if(match)return uiText('Level {value0} · {value1}',{value0:match[1],value1:uiText({complete:'Level complete','next-cell answer':'Next-cell answer','thinking hint':'Thinking hint'}[match[2]])});
 match=reason.match(/^(.*) · (Explained answer|hint [123])$/);
 if(match)return uiText(match[1])+' · '+uiText(match[2]);
 return uiText(reason);
}
