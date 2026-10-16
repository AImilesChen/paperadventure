// Fixed fields and numeric measurements only. Never expose candidate prose.
export const normalizePlanText = value => typeof value === 'string' ? value.normalize('NFKD')
  .replace(/[\u0300-\u036f]/g,'').replace(/[\u2018\u2019]/g,"'").replace(/[\u201c\u201d]/g,'"')
  .replace(/[\u2013\u2014]/g,'-').replace(/\u2026/g,'...').replace(/[\u00a0\u202f]/g,' ').replace(/\u2022/g,'-').trim() : value;
export const sentenceEnds = value => /[.!?]["')\]]*$/.test(String(value||'').trim());

export function normalizePlanCandidate(raw){
  if(!raw||typeof raw!=='object'||Array.isArray(raw))return raw;
  const candidate={...raw};
  for(const field of ['title','summary','premise','opening','goal'])candidate[field]=normalizePlanText(candidate[field]);
  if(Array.isArray(raw.themeAnchors))candidate.themeAnchors=raw.themeAnchors.map(normalizePlanText);
  if(Array.isArray(raw.stages))candidate.stages=raw.stages.map(stage=>({...stage,scene:normalizePlanText(stage?.scene),storyBeat:normalizePlanText(stage?.storyBeat)}));
  return candidate;
}

const fields=['title','summary','premise','goal','scene','storyBeat','storyContext'];
const rules=['missing','length','characters','sentence'];
export function safePlanFormatIssue(issue){
  if(!issue||!fields.includes(issue.field)||!rules.includes(issue.rule))return null;
  const result={field:issue.field,rule:issue.rule};
  if(['scene','storyBeat','storyContext'].includes(issue.field)){
    if(!Number.isInteger(issue.stage)||issue.stage<1||issue.stage>5)return null;
    result.stage=issue.stage;
  }
  if(issue.rule==='length'){
    if(!Number.isInteger(issue.length)||issue.length<0||issue.length>1000000||!Number.isInteger(issue.limit)||issue.limit<1||issue.limit>900)return null;
    result.length=issue.length;result.limit=issue.limit;
  }
  return result;
}

export const planFormatIssue = raw => planFormatIssues(raw)[0]||null;
export function planFormatIssues(raw){
  const candidate=normalizePlanCandidate(raw);
  if(!candidate||typeof candidate!=='object')return [];
  const issues=[];
  const check=(value,field,limit,stage,complete=false)=>{
    let rule;
    if(typeof value!=='string'||!value.trim())rule='missing';
    else if(value.length>limit)rule='length';
    else if(/[^\x20-\x7e\n\r]/.test(value))rule='characters';
    else if(complete&&!sentenceEnds(value))rule='sentence';
    return rule?safePlanFormatIssue({field,rule,stage,length:value?.length||0,limit}):null;
  };
  for(const [field,limit,complete] of [['premise',200,true],['title',70],['summary',600],['goal',180]]){
    const issue=check(candidate[field],field,limit,undefined,complete);if(issue)issues.push(issue);
  }
  if(!Array.isArray(candidate.stages))return issues;
  for(const [index,stage] of candidate.stages.entries()){
    const before=issues.length;
    for(const [field,limit,complete] of [['scene',80],['storyBeat',140,true]]){
      const issue=check(stage[field],field,limit,index+1,complete);if(issue)issues.push(issue);
    }
    if(issues.length!==before)continue;
    const context=`${stage.scene.replace(/[.!?]+$/,'')}. ${stage.storyBeat}`;
    const issue=check(context,'storyContext',220,index+1);if(issue)issues.push(issue);
  }
  return issues;
}

export function planFormatMessage(value){
  const issue=safePlanFormatIssue(value);if(!issue)return '';
  const labels={title:'Title',summary:'Summary',premise:'Story opening',goal:'Mission',scene:'Location',storyBeat:'Story event',storyContext:'Story moment'};
  const label=(issue.stage?`Checkpoint ${issue.stage}: `:'')+labels[issue.field];
  return issue.rule==='length'?`${label} has ${issue.length} characters; the limit is ${issue.limit}.`:
    `${label} ${ {missing:'is missing.',characters:'contains unsupported printable characters.',sentence:'needs a complete sentence.'}[issue.rule]}`;
}
