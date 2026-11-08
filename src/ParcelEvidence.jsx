import { Check, X } from '@phosphor-icons/react';
import { parcels, parcelRecords, verifiedParcelRecords, parcelRecipients, parcelContents, parcelSvg, parcelSolution, parcelSteps } from '../shared/parcel-evidence.mjs';
import './parcelEvidence.css';

export function ParcelRule() {
  return <div className="pe-rule"><p>Find the parcel holding the <strong>compass</strong> and the <strong>one false copied note</strong>.</p><div><p><strong>Recipients</strong> {parcelRecipients.join(' · ')}</p><p><strong>Contents</strong> {parcelContents.join(' · ')}</p></div><p className="pe-once">Each person receives one parcel. Each parcel holds one item. Use every person and item exactly once.</p></div>;
}
export default function ParcelEvidence({ data, edit }) {
  const change = next => edit({ ...data, ...next });
  function exclude(id) {
    const wasExcluded = data.excluded.includes(id);
    change({ excluded: wasExcluded ? data.excluded.filter(value => value !== id) : [...data.excluded, id], selected: !wasExcluded && data.selected === id ? '' : data.selected });
  }
  return <div className="pe-game">
    <section className="pe-verified" aria-labelledby="pe-verified-title"><div className="pe-section-heading"><h3 id="pe-verified-title">Verified records</h3><strong className="pe-badge">All four are true</strong></div><ol>{verifiedParcelRecords.map(record => <li key={record.number}><span>V{record.number}</span><p>{record.text}</p></li>)}</ol><p className="pe-word-help">“Exactly one more” means the stamp counts differ by 1.</p></section>
    <section className="pe-records" aria-labelledby="pe-records-title">
      <div className="pe-section-heading"><h3 id="pe-records-title">Copied notes</h3><strong className="pe-badge">Two true · One false</strong></div>
      <p className="pe-instruction">Compare the evidence, then mark the one copied note you think is false.</p>
      <div className="pe-record-grid" role="group" aria-label="Choose the false copied note">{parcelRecords.map(record => <button key={record.number} aria-label={`Note ${record.label}: ${record.text}`} aria-pressed={data.wrongRecord === record.number} onClick={() => change({ wrongRecord: data.wrongRecord === record.number ? null : record.number })}><span className="pe-record-number">{record.label}</span><span>{record.text}<small>{data.wrongRecord === record.number ? 'My choice · false note' : 'Mark as false'}</small></span></button>)}</div>
    </section>
    <section className="pe-candidates" aria-labelledby="pe-candidates-title"><div className="pe-section-heading"><h3 id="pe-candidates-title">The four sealed parcels</h3><p>The recipients and contents are hidden.</p></div>
      <div className="pe-parcels" role="group" aria-label="Choose the parcel holding the compass">{parcels.map(p => <div key={p.id} className={`pe-card${data.selected === p.id ? ' is-chosen' : ''}${data.excluded.includes(p.id) ? ' is-excluded' : ''}`}><button className="pe-choose" aria-label={`Choose parcel ${p.id}`} aria-pressed={data.selected === p.id} disabled={data.excluded.includes(p.id)} aria-describedby={`pe-attributes-${p.id}`} onClick={() => change({ selected: data.selected === p.id ? '' : p.id })}><span className="pe-card-label">Parcel {p.id}<span>{data.selected === p.id ? <><Check size={14}/> Selected</> : data.excluded.includes(p.id) ? 'Crossed out' : 'Choose'}</span></span><span className="pe-drawing" aria-hidden="true" dangerouslySetInnerHTML={{ __html: parcelSvg(p.id) }}/><span className="pe-attributes" id={`pe-attributes-${p.id}`}><strong>{p.stamps} {p.stamps === 1 ? 'stamp' : 'stamps'}</strong><br/>{p.pattern} · {p.ribbon} ribbon</span></button><button className="pe-exclude" aria-label={`${data.excluded.includes(p.id) ? 'Restore' : 'Cross out'} parcel ${p.id}`} aria-pressed={data.excluded.includes(p.id)} onClick={() => exclude(p.id)}>{data.excluded.includes(p.id) ? 'Restore' : <><X size={14}/> Cross out</>}</button></div>)}</div>
    </section>
    <div className="pe-judgment" role="status"><strong>My answer</strong><span>Compass in <b>{data.selected ? `parcel ${data.selected}` : '—'}</b></span><span>False note <b>{parcelRecords.find(r => r.number === data.wrongRecord)?.label || '—'}</b></span></div>
    <details className="pe-notebook"><summary>Optional notebook · not marked</summary><label htmlFor="pe-notes">Write your working ideas. These notes save in this browser and do not affect your answer.</label><textarea id="pe-notes" maxLength={1600} rows={3} value={data.notes} onChange={e => change({ notes: e.target.value })} placeholder="For example: if the map were in A…"/><small>{data.notes.length}/1600 characters</small></details>
  </div>;
}
export function ParcelAllocation() {
  return <div className="pe-allocation"><table><caption>The restored parcel ledger</caption><thead><tr><th scope="col">Parcel</th><th scope="col">Recipient</th><th scope="col">Content</th></tr></thead><tbody>{parcelSolution.map(p => <tr key={p.id}><th scope="row">{p.id}</th><td>{p.recipient}</td><td>{p.content}</td></tr>)}</tbody></table></div>;
}
export function ParcelExplanation() {
  return <div className="pe-explanation"><h3>How the evidence fits</h3><ol>{parcelSteps.map(step => <li key={step.title}><strong>{step.title}</strong><p>{step.text}</p></li>)}</ol><ParcelAllocation/><p><strong>Copied note III is false:</strong> Ava has the compass. Cleo has the key. Notes I and II are true.</p></div>;
}
export function ParcelDelivered() {
  return <div className="pe-delivered"><h3>The parcel ledger is restored.</h3><p>Parcel A holds Ava's compass. Copied note III is false.</p><ParcelAllocation/><p>Open the explanation to follow all seven deductions, including why the other map locations fail.</p></div>;
}
