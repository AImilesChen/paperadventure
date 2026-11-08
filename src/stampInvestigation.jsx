import { useEffect, useState } from 'react';
import { stampRecords, stampLabels, inspectStampMatches } from '../shared/stamp-investigation.mjs';
import StampGlyph from './StampGlyph.jsx';
import PostalRoute from './PostalRoute.jsx';
import './stampInvestigation.css';
import './stampWorkbench.css';
import { PostalPocketKey } from './PostalRoute.jsx';


export default function StampInvestigation({ data, edit, notify, locked, routeSelected, onRouteSelect, onUndo, canUndo, onRestart, showRoute, onVerified, onContinue }) {
  const [selected, setSelected] = useState('');
  const [badRecords, setBadRecords] = useState([]);
  useEffect(() => setBadRecords([]), [data.matches]);
  const shownErrors = badRecords.filter(id => data.matches.some(Boolean));
  function place(index) {
    if (data.verified) return;
    if (!selected) { if (data.matches[index]) setSelected(data.matches[index]); else notify('Choose a word above, then choose the record it matches.'); return; }
    const matches = [...data.matches], previous = matches.indexOf(selected);
    if (previous === index) { setSelected(''); return; }
    if (previous !== -1) matches[previous] = matches[index];
    matches[index] = selected;
    edit({ ...data, matches, verified: false, route: ['', '', '', '', ''], pair: [] });
    setSelected(''); setBadRecords([]); notify('');
  }
  function focusPhase() {
    requestAnimationFrame(() => {
      document.getElementById('stamp-code-title')?.focus({ preventScroll: true });
      document.getElementById('stamp-code')?.scrollIntoView({ block: 'start', behavior: 'instant' });
    });
  }
  function verify() {
    const result = inspectStampMatches(data.matches);
    if (!result.ok) {
      const row = result.message.match(/Record ([A-D])/);
      const shape = result.message.match(/The (\w+) has different letters/);
      setBadRecords(row ? [row[1]] : shape ? stampRecords.filter(r => r.shapes.includes(shape[1])).map(r => r.id) : stampRecords.filter((r,i) => !data.matches[i]).map(r => r.id));
      notify(result.message); return;
    }
    onVerified(); setBadRecords([]);
    edit({ ...data, verified: true });
    setSelected(''); notify('');
    focusPhase();
  }
  return <div className="si-investigation">
    {!showRoute ? <div>
      <h3 className="pv-section-title">Choose a word</h3><p className="pw-instruction" role="status">{selected ? `${selected} selected. Choose its row below.` : 'Choose a word, then choose the row it matches.'}</p>
      <div className="si-label-bank" role="group" aria-label="Loose word labels">{stampLabels.map(label => {
        return <button key={label.word} aria-label={`Select label ${label.word}`} aria-pressed={selected === label.word} disabled={data.verified} onClick={() => { setSelected(selected === label.word ? '' : label.word); notify(''); }}><strong>{label.word}</strong>{data.matches.includes(label.word) && <small>Record {stampRecords[data.matches.indexOf(label.word)].id} · move</small>}</button>;
      })}</div>
      <h3 className="pv-section-title pv-records-title">Match the four original records</h3><div className="si-records" role="group" aria-label="Old stamp records">{stampRecords.map((record, i) => <div className={`si-record${shownErrors.includes(record.id) ? ' pv-record-error' : ''}`} key={record.id}>
        <strong className="si-record-id">{record.id}</strong>
        <div className="si-symbols" role="img" aria-label={`Record ${record.id}: ${record.shapes.join(', ')}`}>{record.shapes.map((shape, j) => <StampGlyph key={j} shape={shape}/>)}</div>
        <button className="si-record-slot" disabled={data.verified} aria-pressed={Boolean(selected && selected === data.matches[i])} aria-label={`Record ${record.id} label: ${data.matches[i] || 'empty'}`} onClick={() => place(i)}>{data.matches[i] || (selected ? 'Place here' : 'Place word')}</button>

      </div>)}</div>
      <div className="si-archive-actions"><button className="pw-check si-verify" disabled={data.verified} onClick={verify}>Check my record matches</button><button disabled={!canUndo || data.verified} onClick={onUndo}>Undo</button>{selected && data.matches.includes(selected) && !data.verified && <button onClick={() => { edit({ ...data, matches: data.matches.map(word => word === selected ? '' : word), verified: false, route: ['', '', '', '', ''], pair: [] }); setSelected(''); setBadRecords([]); notify(''); }}>Remove {selected} match</button>}<button onClick={onRestart}>Restart puzzle</button></div>
      {data.verified && <section className="pv-stage-success" aria-label="First stage complete"><strong>✓ Stage 1 complete · key restored</strong><p>The four records agree. Use your key to investigate the delivery route.</p><PostalPocketKey code={inspectStampMatches(data.matches).key}/><button onClick={() => edit({ ...data, verified: false })}>Revise matches</button><button className="pw-check" onClick={onContinue}>Continue to stage 2 · restore route →</button></section>}
    </div> : <PostalRoute data={data} edit={edit} notify={notify} locked={locked} selected={routeSelected} onSelect={onRouteSelect}/>}
  </div>;
}
