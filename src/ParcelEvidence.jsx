import { t as translateUi } from "./i18n/index.mjs";import { Check, X } from '@phosphor-icons/react';
import { parcels, parcelRecords, verifiedParcelRecords, parcelRecipients, parcelContents, parcelSvg, parcelSolution, parcelSteps } from '../shared/parcel-evidence.mjs';
import './parcelEvidence.css';

export function ParcelRule() {
  return <div className="pe-rule"><p>{translateUi("Find the parcel holding the ")}<strong>{translateUi("compass")}</strong>{translateUi(" and the ")}<strong>{translateUi("one false copied note")}</strong>.</p><div><p><strong>{translateUi("Recipients")}</strong> {translateUi(parcelRecipients.join(' · '))}</p><p><strong>{translateUi("Contents")}</strong> {translateUi(parcelContents.join(' · '))}</p></div><p className="pe-once">{translateUi("Each person receives one parcel. Each parcel holds one item. Use every person and item exactly once.")}</p></div>;
}
export default function ParcelEvidence({ data, edit }) {
  const change = (next) => edit({ ...data, ...next });
  function exclude(id) {
    const wasExcluded = data.excluded.includes(id);
    change({ excluded: wasExcluded ? data.excluded.filter((value) => value !== id) : [...data.excluded, id], selected: !wasExcluded && data.selected === id ? '' : data.selected });
  }
  return <div className="pe-game">
    <section className="pe-verified" aria-labelledby="pe-verified-title"><div className="pe-section-heading"><h3 id="pe-verified-title">{translateUi("Verified records")}</h3><strong className="pe-badge">{translateUi("All four are true")}</strong></div><ol>{verifiedParcelRecords.map((record) => <li key={record.number}><span>V{translateUi(record.number)}</span><p>{translateUi(record.text)}</p></li>)}</ol><p className="pe-word-help">{translateUi("\u201CExactly one more\u201D means the stamp counts differ by 1.")}</p></section>
    <section className="pe-records" aria-labelledby="pe-records-title">
      <div className="pe-section-heading"><h3 id="pe-records-title">{translateUi("Copied notes")}</h3><strong className="pe-badge">{translateUi("Two true \xB7 One false")}</strong></div>
      <p className="pe-instruction">{translateUi("Compare the evidence, then mark the one copied note you think is false.")}</p>
      <div className="pe-record-grid" role="group" aria-label={translateUi("Choose the false copied note")}>{parcelRecords.map((record) => <button key={record.number} aria-label={translateUi("Note {value0}: {value1}", { value0: record.label, value1: record.text })} aria-pressed={data.wrongRecord === record.number} onClick={() => change({ wrongRecord: data.wrongRecord === record.number ? null : record.number })}><span className="pe-record-number">{translateUi(record.label)}</span><span>{translateUi(record.text)}<small>{data.wrongRecord === record.number ? translateUi('My choice · false note') : translateUi('Mark as false')}</small></span></button>)}</div>
    </section>
    <section className="pe-candidates" aria-labelledby="pe-candidates-title"><div className="pe-section-heading"><h3 id="pe-candidates-title">{translateUi("The four sealed parcels")}</h3><p>{translateUi("The recipients and contents are hidden.")}</p></div>
      <div className="pe-parcels" role="group" aria-label={translateUi("Choose the parcel holding the compass")}>{parcels.map((p) => <div key={p.id} className={`pe-card${data.selected === p.id ? ' is-chosen' : ''}${data.excluded.includes(p.id) ? ' is-excluded' : ''}`}><button className="pe-choose" aria-label={translateUi("Choose parcel {value0}", { value0: p.id })} aria-pressed={data.selected === p.id} disabled={data.excluded.includes(p.id)} aria-describedby={`pe-attributes-${p.id}`} onClick={() => change({ selected: data.selected === p.id ? '' : p.id })}><span className="pe-card-label">{translateUi("Parcel ")}{translateUi(p.id)}<span>{data.selected === p.id ? <><Check size={14} />{translateUi(" Selected")}</> : data.excluded.includes(p.id) ? translateUi('Crossed out') : translateUi('Choose')}</span></span><span className="pe-drawing" aria-hidden="true" dangerouslySetInnerHTML={{ __html: parcelSvg(p.id) }} /><span className="pe-attributes" id={`pe-attributes-${p.id}`}><strong>{translateUi(p.stamps)} {p.stamps === 1 ? translateUi('stamp') : translateUi('stamps')}</strong><br />{translateUi(p.pattern)} · {translateUi(p.ribbon)}{translateUi(" ribbon")}</span></button><button className="pe-exclude" aria-label={translateUi("{value0} parcel {value1}", { value0: data.excluded.includes(p.id) ? 'Restore' : 'Cross out', value1: p.id })} aria-pressed={data.excluded.includes(p.id)} onClick={() => exclude(p.id)}>{data.excluded.includes(p.id) ? translateUi('Restore') : <><X size={14} />{translateUi(" Cross out")}</>}</button></div>)}</div>
    </section>
    <div className="pe-judgment" role="status"><strong>{translateUi("My answer")}</strong><span>{translateUi("Compass in ")}<b>{data.selected ? translateUi("parcel {value0}", { value0: data.selected }) : translateUi('—')}</b></span><span>{translateUi("False note ")}<b>{parcelRecords.find((r) => r.number === data.wrongRecord)?.label || translateUi('—')}</b></span></div>
    <details className="pe-notebook"><summary>{translateUi("Optional notebook \xB7 not marked")}</summary><label htmlFor="pe-notes">{translateUi("Write your working ideas. These notes save in this browser and do not affect your answer.")}</label><textarea id="pe-notes" maxLength={1600} rows={3} value={data.notes} onChange={(e) => change({ notes: e.target.value })} placeholder={translateUi("For example: if the map were in A…")} /><small>{data.notes.length}/1600 characters</small></details>
  </div>;
}
export function ParcelAllocation() {
  return <div className="pe-allocation"><table><caption>{translateUi("The restored parcel ledger")}</caption><thead><tr><th scope="col">{translateUi("Parcel")}</th><th scope="col">{translateUi("Recipient")}</th><th scope="col">{translateUi("Content")}</th></tr></thead><tbody>{parcelSolution.map((p) => <tr key={p.id}><th scope="row">{translateUi(p.id)}</th><td>{translateUi(p.recipient)}</td><td>{translateUi(p.content)}</td></tr>)}</tbody></table></div>;
}
export function ParcelExplanation() {
  return <div className="pe-explanation"><h3>{translateUi("How the evidence fits")}</h3><ol>{parcelSteps.map((step) => <li key={step.title}><strong>{translateUi(step.title)}</strong><p>{translateUi(step.text)}</p></li>)}</ol><ParcelAllocation /><p><strong>{translateUi("Copied note III is false:")}</strong>{translateUi(" Ava has the compass. Cleo has the key. Notes I and II are true.")}</p></div>;
}
export function ParcelDelivered() {
  return <div className="pe-delivered"><h3>{translateUi("The parcel ledger is restored.")}</h3><p>{translateUi("Parcel A holds Ava's compass. Copied note III is false.")}</p><ParcelAllocation /><p>{translateUi("Open the explanation to follow all seven deductions, including why the other map locations fail.")}</p></div>;
}
