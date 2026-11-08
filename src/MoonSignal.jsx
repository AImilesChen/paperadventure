import { ArrowRight, Broadcast, RocketLaunch } from '@phosphor-icons/react';
import { moonAlphabet, moonRecords, moonMessage } from '../shared/moon-signal.mjs';
import './moonSignal.css';

export default function MoonSignal({ data, edit, locked, notify, onSubmit }) {
  return <div className="ms-game">
    <section className="ms-evidence" aria-labelledby="ms-records-title">
      <h3 id="ms-records-title">Find the rule in these three records</h3>
      <p className="ms-rules">All records use the same method. Every word keeps the same number of letters.</p>
      <div className="me-records">{moonRecords.map((record,i)=><article key={i} aria-label={`Communication record ${i+1}`}><h4>Record {i+1}</h4><div><span>Original</span><strong>{record.original}</strong></div><ArrowRight size={20} aria-hidden="true"/><div><span>Received</span><strong>{record.sent}</strong></div></article>)}</div>
      <p className="ms-plain-alphabet" aria-label="Alphabet"><span>Alphabet reference</span> {moonAlphabet}</p>
    </section>
    <section className="ms-final" aria-labelledby="ms-final-title">
      <div><h3 id="ms-final-title">Decode the final message</h3><p>It names the rescue meeting point. Use the same rule to find the original four-letter word.</p></div>
      <div className="ms-answer-row"><div className="ms-packet"><span>RECEIVED</span><strong>{moonMessage}</strong></div><ArrowRight size={23} aria-hidden="true"/><label htmlFor="ms-answer">Your answer<input id="ms-answer" aria-label="Original word for NFRG" type="text" maxLength={4} autoCapitalize="characters" autoComplete="off" spellCheck={false} value={data.answer} disabled={locked} onChange={e=>{edit({...data,answer:e.target.value});notify('');}} onKeyDown={e=>{if(e.key==='Enter'&&!locked){e.preventDefault();onSubmit();}}}/></label></div>
    </section>
  </div>;
}
export function MoonConnected(){return <div className="ms-connected"><Broadcast size={32}/><div><strong>Communication restored</strong><p>The rescue ship will meet you at the dock. You decoded the message!</p></div><RocketLaunch size={30} className="ms-ship"/></div>;}
