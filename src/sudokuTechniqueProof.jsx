import {ArrowRight,CheckCircle,WarningCircle,BookOpen} from '@phosphor-icons/react';
import {coordinate,groupName,formatList} from '../shared/sudoku/learning.mjs';
import {tutorialProof} from '../shared/sudoku/tutorial-proof.mjs';
import './sudoku-technique-proof.css';

const list=values=>formatList(values);
function Reading({lesson,index,children}){const [heading,text]=lesson.reading[index];return <section className="tp-reading"><h3>{heading}</h3><p>{text}</p>{children}</section>;}
function Comparison({caption,headers,rows}){return <div className="tt-table-wrap tp-table" tabIndex={0} aria-label={caption}><table><caption>{caption}</caption><thead><tr>{headers.map(h=><th key={h} scope="col">{h}</th>)}</tr></thead><tbody>{rows.map(([label,...cells])=><tr key={label}><th scope="row">{label}</th>{cells.map((c,i)=><td key={i}>{c}</td>)}</tr>)}</tbody></table></div>;}
function Changes({proof}){return <Comparison caption="What changes after the justified removals?" headers={['Cell','Before','Remove','Remaining']} rows={proof.changes.map(r=>[coordinate(r.cell),list(r.before),list(r.removed),list(r.after)])}/>;}
function NextCheck({proof}){return <div className="tp-result"><CheckCircle size={25}/><div><strong>Now check for a single</strong><p>{proof.placements.length?proof.placements.map(p=>`${coordinate(p.cell)} now has only ${p.digit}.`).join(' '):'No affected cell has just one candidate yet.'} {proof.changes.some(r=>r.after.length>1)?'Other affected cells still have several candidates; leave them unfilled.':''} Update notes after each placement before looking for another pattern.</p></div></div>;}
function References({lesson}){
 const reference={single:['tech_singles.php','HoDoKu: naked singles and full houses'],locked:['tech_intersections.php','HoDoKu: pointing and claiming'],pair:['tech_naked.php','HoDoKu: naked pairs and subsets']}[lesson.id];
 return <section className="tt-reading-section tp-sources" id="technique-sources"><h2>Sources and further practice</h2><div className="tp-source-grid"><div><h3><BookOpen size={22}/>Technique reference</h3><p><a href={'https://hodoku.sourceforge.net/en/'+reference[0]} rel="noreferrer">{reference[1]} →</a></p><p>The reference explains the general rule. The boards, deductions and exercises here are our own teaching examples, separate from your game.</p></div><div><h3>Use the method yourself</h3><p><a href="#try-it">Try the independent exercise below →</a></p><p><a href="/en/sudoku/techniques/">Compare all four techniques →</a></p><a href="/en/contact/">Report an unclear or incorrect step →</a></div></div></section>;
}

export function TechniqueProof({lesson:l}){
 const p=tutorialProof(l),f=l.demo,group=groupName(f.unit),coords=f.cells.map(coordinate);
 return <section className="tt-reading-section tp-proof" id="complete-proof" aria-labelledby="tp-proof-title"><span className="tt-eyebrow">FOLLOW THE COMPLETE REASONING</span>
 {l.id==='single'?<>
  <h2 id="tp-proof-title">How does {coordinate(p.cell)} become a single candidate?</h2>
  <p className="tp-answer"><strong>{coordinate(p.cell)} must be {p.digit} because its row, column and box exclude every other digit.</strong> The row alone leaves {p.stages[0].remaining.length} possibilities. This is a naked single, rather than simply the last empty cell in a row.</p>
  <Reading lesson={l} index={0}><ol className="tp-stages" aria-label="Candidates remaining after each group check">{p.stages.map((s,i)=><li key={s.label}><span className="tp-stage-number">0{i+1}</span><h4>{s.label}</h4><span>Remove {list(s.removed)}</span><strong>{list(s.remaining)}</strong><span>{s.remaining.length===1?'One candidate remains':'Candidates remaining'}</span></li>)}</ol><p>Start with all nine digits. Keep only the digits missing from {group}, then remove those already present in the crossing column and box. The evidence table above names a visible clue for every exclusion.</p></Reading>
  <Comparison caption="Three patterns that can each force a placement" headers={['Pattern','What you check','What makes it forced']} rows={[
   ['Last empty cell','One row, column or box','The group is missing one digit and has one empty cell.'],
   ['Single candidate / naked single','One cell’s row, column and box','Those three groups together leave only one digit for the cell.'],
   ['Hidden single','Every position for one digit in a group','The digit has only one possible home; that cell may have other notes.'],
  ]}/>
  <div className="tp-caution"><WarningCircle size={25}/><p><strong>One written note is not automatically a single.</strong> If you wrote only {p.digit} but skipped other legal candidates, the note alone proves nothing. Recheck all three groups. The changed-clue example below shows why an extra possibility breaks this move.</p></div>
  <Reading lesson={l} index={1}/><a className="tt-text-link" href="/en/sudoku/techniques/hidden-single/">Compare with a hidden single <ArrowRight size={18}/></a>
 </>:l.id==='locked'?<>
  <h2 id="tp-proof-title">Why can {f.digit} be removed outside {groupName(f.box)}?</h2>
  <p className="tp-answer"><strong>{groupName(f.box)} can place {f.digit} only at {list(p.positions.map(coordinate))}, all in {group}.</strong> Wherever that box places its {f.digit}, the rest of the same row cannot contain another {f.digit}.</p>
  <Reading lesson={l} index={0}><div className="tp-cases" aria-label="Every position gives the same exclusion">{p.positions.map(cell=><article key={cell}><span>IF</span><h4>{coordinate(cell)} = {f.digit}</h4><p>Then {group} already has its {f.digit}. Remove {f.digit} from {list(p.changes.map(r=>coordinate(r.cell)))} outside the box.</p></article>)}</div><p>These are cases considered by this rule, not two completed solutions. Each case gives the same outside removals, so you can make those removals without choosing an inside position.</p></Reading>
  <Reading lesson={l} index={1}><Changes proof={p}/><NextCheck proof={p}/></Reading>
  <Reading lesson={l} index={2}><Comparison caption="Pointing and claiming use different starting groups" headers={['Form','Establish first','Remove from']} rows={[
   ['Pointing — this worked example','All positions for one digit in a box share one line.','That row or column outside the box.'],
   ['Claiming — the reverse direction','All positions for one digit in a line share one box.','Other cells of that box outside the line.'],
  ]}/></Reading><div className="tp-caution"><WarningCircle size={25}/><p><strong>Check every empty cell in the box.</strong> Two aligned notes do not establish a lock if another legal position exists off that line. Keep the inside candidates. The changed-clue example below demonstrates that failure.</p></div>
 </>:<>
  <h2 id="tp-proof-title">Why do these two cells reserve both digits?</h2>
  <p className="tp-answer"><strong>{coords.join(' and ')} each allow exactly {list(f.digits)} in {group}.</strong> Those digits must occupy those two cells in some order, so neither digit can appear in another cell of that row.</p>
  <Reading lesson={l} index={0}><div className="tp-cases" aria-label="The two arrangements considered by the pair rule">{[f.digits,[...f.digits].reverse()].map((ds,i)=><article key={i}><span>CASE {i+1}</span><h4>{coords[0]} = {ds[0]}<br/>{coords[1]} = {ds[1]}</h4><p>Either way, {group} uses both {list(f.digits)} in the same two cells.</p></article>)}</div><p>The pair condition alone does not choose between these arrangements. Other clues may determine their order later; this step only proves the eliminations.</p></Reading>
  <Reading lesson={l} index={1}><Changes proof={p}/><NextCheck proof={p}/><p>The two cells also share a box. To use that box as a second removal region, check its candidates separately; the evidence and removals on this page are specifically for {group}.</p></Reading>
  <Reading lesson={l} index={2}><Comparison caption="When similar-looking notes do and do not form a pair" headers={['What the notes show','Can you apply a naked pair?','Why']} rows={[
   [`Two cells each contain only ${list(f.digits)}`,'Yes, within a shared group.','Two cells reserve precisely those two digits.'],
   ['One of the cells has a third candidate','No.','It could use the extra digit, so the two-cell reservation is not established.'],
   ['Three cells each show only the same two digits','Stop and recheck entries and notes.','Three cells in one group cannot all be filled using only two digits.'],
  ]}/></Reading><div className="tp-caution"><WarningCircle size={25}/><p><strong>Do not erase a third candidate to make a pattern fit.</strong> That candidate needs its own valid exclusion. The changed-clue example below shows an actual extra note that invalidates the original pair.</p></div>
 </>}
 </section>;
}
export {References as TechniqueReferences};
