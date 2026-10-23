import { useState } from 'react';
import { mechanicById } from '../shared/creator-plan.mjs';
export function PlanPreview({plan,compact=false,showPreparation=true}) {
  if (!plan) return null;
  return <section className={'creator-plan-preview'+(compact?' compact':'')} aria-label="Your five-checkpoint adventure">
    {!compact && <><span className="eyebrow">YOUR PERSONAL PLAN</span><h3>{plan.title}</h3><p>{plan.opening}</p><dl className="creator-plan-facts"><div><dt>Your team</dt><dd>{plan.roles}</dd></div><div><dt>Your mission</dt><dd>{plan.goal}</dd></div></dl></>}
    <h3 className="creator-small-heading">{compact?'Five connected checkpoints':'How your five checkpoints will play'}</h3><ol className="creator-checkpoints">{plan.stages.map(item=><li key={item.number}><span className="creator-checkpoint-number" aria-hidden="true">{item.number}</span><div><span className="creator-style-label">{plan.playAllocationVersion===1&&item.number===5?'Finale · combine your results':mechanicById(item.mechanic)?.title}</span><h4>{item.title}</h4>{item.storyContext&&<p><strong>Story moment:</strong> {item.storyContext}</p>}<p>{item.task}</p>{!compact && <><p className="creator-team-action"><strong>Work together:</strong> {item.teamwork}</p><p className="creator-connection"><strong>Next:</strong> {item.connection}</p></>}</div></li>)}</ol>
    {!compact && showPreparation && <div className="creator-preparation"><h3 className="creator-small-heading">Prepare to play</h3><p>{plan.preparation}</p><p className="small-muted">For new custom orders, complete clues, answers and PDFs are generated after plan approval and quality checks.</p></div>}
  </section>;
}
export function PlaySample({mechanic}) {
  const [selected,setSelected]=useState(null);
  const style=mechanicById(mechanic) || mechanicById('reasoning'),sample=style.sample;
  return <section className="creator-play-sample" aria-label="Independent play example"><span className="eyebrow">TRY THE PLAY STYLE</span><h3>{style.action}</h3><p className="small-muted">An independent practice example, not a checkpoint or answer from your adventure.</p><p>{sample.clue}</p><div className="creator-sample-options">{sample.options.map((option,index)=><button type="button" key={option} aria-pressed={selected===index} onClick={()=>setSelected(index)}><span>{String.fromCharCode(65+index)}</span>{option}</button>)}</div>{selected!==null && <p className="creator-sample-feedback" role="status"><strong>{selected===sample.answer?'That fits.':'Check both the rule and the facts.'}</strong> {sample.explanation}</p>}</section>;
}
