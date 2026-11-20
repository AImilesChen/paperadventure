import { t as translateUi } from "./i18n/index.mjs";import { ArrowRight, Broadcast, RocketLaunch } from '@phosphor-icons/react';
import { moonAlphabet, moonRecords, moonMessage } from '../shared/moon-signal.mjs';
import './moonSignal.css';

export default function MoonSignal({ data, edit, locked, notify, onSubmit }) {
  return <div className="ms-game">
    <section className="ms-evidence" aria-labelledby="ms-records-title">
      <h3 id="ms-records-title">{translateUi("Find the rule in these three records")}</h3>
      <p className="ms-rules">{translateUi("All records use the same method. Every word keeps the same number of letters.")}</p>
      <div className="me-records">{moonRecords.map((record, i) => <article key={i} aria-label={translateUi("Communication record {value0}", { value0: i + 1 })}><h4>{translateUi("Record ")}{translateUi(i + 1)}</h4><div><span>{translateUi("Original")}</span><strong>{translateUi(record.original)}</strong></div><ArrowRight size={20} aria-hidden="true" /><div><span>{translateUi("Received")}</span><strong>{translateUi(record.sent)}</strong></div></article>)}</div>
      <p className="ms-plain-alphabet" aria-label={translateUi("Alphabet")}><span>{translateUi("Alphabet reference")}</span> {translateUi(moonAlphabet)}</p>
    </section>
    <section className="ms-final" aria-labelledby="ms-final-title">
      <div><h3 id="ms-final-title">{translateUi("Decode the final message")}</h3><p>{translateUi("It names the rescue meeting point. Use the same rule to find the original four-letter word.")}</p></div>
      <div className="ms-answer-row"><div className="ms-packet"><span>{translateUi("RECEIVED")}</span><strong>{translateUi(moonMessage)}</strong></div><ArrowRight size={23} aria-hidden="true" /><label htmlFor="ms-answer">{translateUi("Your answer")}<input id="ms-answer" aria-label={translateUi("Original word for NFRG")} type="text" maxLength={4} autoCapitalize="characters" autoComplete="off" spellCheck={false} value={data.answer} disabled={locked} onChange={(e) => {edit({ ...data, answer: e.target.value });notify('');}} onKeyDown={(e) => {if (e.key === 'Enter' && !locked) {e.preventDefault();onSubmit();}}} /></label></div>
    </section>
  </div>;
}
export function MoonConnected() {return <div className="ms-connected"><Broadcast size={32} /><div><strong>{translateUi("Communication restored")}</strong><p>{translateUi("The rescue ship will meet you at the dock. You decoded the message!")}</p></div><RocketLaunch size={30} className="ms-ship" /></div>;}
