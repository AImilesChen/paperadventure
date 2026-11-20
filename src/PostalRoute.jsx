import { t as translateUi } from "./i18n/index.mjs";import { postalStops, postalClues, stampShapeNames, movePostalStop } from '../shared/stamp-investigation.mjs';
import StampGlyph from './StampGlyph.jsx';

const wordShapes = (word, key) => [...word].map((letter) => Object.keys(key).find((shape) => key[shape] === letter));
export function PostalHowToPlay() {
  return <section className="pr-how" aria-labelledby="postal-how-title">
    <h3 id="postal-how-title">{translateUi("How to play")}</h3>
    <ol>
      <li><strong>{translateUi("Read the five records.")}</strong>{translateUi(" Replace each symbol with its letter using your restored key. Read each coded place name from left to right.")}</li>
      <li><strong>{translateUi("Arrange the five places.")}</strong>{translateUi(" Choose a place, then a numbered stop. To move a placed card, select it and choose another stop; the two cards swap.")}</li>
      <li><strong>{translateUi("Check your route.")}</strong>{translateUi(" Make all five records fit your route.")}</li>
    </ol>
  </section>;
}
export function PostalPocketKey({ code }) {
  return <div className="pr-key-bar"><strong>{translateUi("Your restored key")}</strong><dl className="pr-pocket-key" aria-label={translateUi("Your restored key")}>{stampShapeNames.map((shape) => <div key={shape}><dt><StampGlyph shape={shape} /><span className="pw-sr-only">{translateUi(shape)}</span></dt><dd>{translateUi(code[shape])}</dd></div>)}</dl></div>;
}
export function PostalRecords({ code, errorClue }) {
  return <section className="pr-evidence" aria-labelledby="postal-evidence-title">
    <header><h3 id="postal-evidence-title" tabIndex={-1}>{translateUi("Five delivery records \xB7 your clues")}</h3><p><strong>{translateUi("Before")}</strong>{translateUi(" can have stops between. ")}<strong>{translateUi("Immediately after")}</strong>{translateUi(" means the very next stop.")}</p></header>
    <ol>{translateUi(postalClues.map((clue, i) => {
        // The heading already explains that "before" permits gaps.
        const parts = i === 0 ? [clue.parts[0], ' was before ', clue.parts[2], '.'] : clue.parts;
        return <li key={i} className={errorClue === i + 1 ? 'pv-record-error' : undefined}><strong className="pr-record-number">{translateUi(i + 1)}</strong><p>{translateUi(parts.map((part, j) => typeof part === 'string' ? <span key={j}>{translateUi(part)}</span> : <span className="pr-cipher" key={j} role="img" aria-label={translateUi("Coded word: {value0}", { value0: wordShapes(part.word, code).join(', ') })}>{wordShapes(part.word, code).map((shape, k) => <StampGlyph key={k} shape={shape} />)}</span>))}</p></li>;
      }))}</ol>
  </section>;
}
export function PostalNotes({ data, edit, code, locked }) {
  const noteWords = ['MALL', 'PALM', 'POOL', 'LOOM'];
  return <details className="pr-scratchpad"><summary>{translateUi("My notes ")}<span>{data.notes.filter(Boolean).length} {data.notes.filter(Boolean).length === 1 ? translateUi('translation') : translateUi('translations')} · {translateUi(data.readClues.length)}/5 records marked read</span></summary>
    <div className="pr-notes"><strong>{translateUi("My translations \xB7 not checked")}</strong>{noteWords.map((word, i) => <label key={word}><span role="img" aria-label={translateUi("Translation note {value0}: {value1}", { value0: i + 1, value1: wordShapes(word, code).join(', ') })}>{wordShapes(word, code).map((shape, j) => <StampGlyph key={j} shape={shape} />)}</span><input aria-label={translateUi("My translation {value0}", { value0: i + 1 })} disabled={locked} value={data.notes[i]} maxLength={4} placeholder={translateUi("4 letters")} autoComplete="off" spellCheck="false" onChange={(e) => edit({ ...data, notes: data.notes.map((note, j) => j === i ? e.target.value : note) })} /></label>)}</div>
    <fieldset className="pr-read-list" disabled={locked}><legend>{translateUi("My reading checklist \xB7 not answer checks")}</legend>{postalClues.map((_, i) => <label key={i}><input aria-label={translateUi("Mark record {value0} as read", { value0: i + 1 })} type="checkbox" checked={data.readClues.includes(i)} onChange={() => edit({ ...data, readClues: data.readClues.includes(i) ? data.readClues.filter((n) => n !== i) : [...data.readClues, i] })} />{translateUi(" Record ")}{translateUi(i + 1)}{translateUi(" read")}</label>)}</fieldset>
  </details>;
}

export default function PostalRoute({ data, edit, notify, locked, selected, onSelect }) {
  const placed = data.route.filter(Boolean).length;
  function place(index, word = selected) {
    if (locked) return;
    if (!word) {
      if (data.route[index]) onSelect(data.route[index]);else
      notify('First choose a place card above. Then choose its numbered stop.');
      return;
    }
    if (word === data.route[index]) {onSelect('');return;}
    // Saved working pairs never become a hidden interaction mode.
    const route = movePostalStop(data.route, word, index);
    edit({ ...data, route, pair: [] });
    onSelect('');notify('');
  }
  const drag = (event, word) => {event.dataTransfer.setData('text/paw-postal-stop', word);event.dataTransfer.effectAllowed = 'move';};
  return <section className="pr-board" aria-labelledby="postal-route-title">
    <header><h3 id="postal-route-title" tabIndex={-1}>{translateUi("Your answer \xB7 delivery route")}</h3><span className="pr-progress">{locked ? translateUi('Route checked') : translateUi("{value0}/5 places placed \xB7 not checked", { value0: placed })}</span></header>
    <p className="pr-instruction" role="status">{selected ? <><strong>{translateUi(selected)}{translateUi(" selected.")}</strong>{translateUi(" Choose a numbered stop below. Moving a placed card swaps the two stops.")}</> : translateUi('Choose a place card, then a numbered stop below. You can change your order at any time.')}</p>
    <div className="pr-bank" role="group" aria-label={translateUi("Place cards")}>{translateUi(postalStops.map((stop) => {
        const position = data.route.indexOf(stop.word);
        return <button key={stop.word} disabled={locked} aria-label={translateUi("Select stop {value0}", { value0: stop.word })} aria-pressed={selected === stop.word} draggable={!locked} onDragStart={(event) => drag(event, stop.word)} onClick={() => {onSelect(selected === stop.word ? '' : stop.word);notify('');}}><strong>{translateUi(stop.word)}</strong><span>{translateUi(stop.place)}</span>{position >= 0 && <small>{translateUi("At stop ")}{translateUi(position + 1)}{translateUi(" \xB7 move")}</small>}</button>;
      }))}</div>
    <div className="pr-route-line"><span className="pr-origin">{translateUi("POST OFFICE ")}<small>{translateUi("Start here")}</small></span><ol className="pr-route" aria-label={translateUi("Delivery route positions")}>{data.route.map((word, i) => <li key={i} onDragOver={(event) => {if (!locked) event.preventDefault();}} onDrop={(event) => {event.preventDefault();if (!locked) place(i, event.dataTransfer.getData('text/paw-postal-stop'));}}>
      <button disabled={locked} aria-label={translateUi("Route position {value0}: {value1}", { value0: i + 1, value1: word || 'empty' })} aria-pressed={Boolean(word && selected === word)} draggable={Boolean(word) && !locked} onDragStart={(event) => drag(event, word)} onClick={() => place(i)}><span>{translateUi("Stop ")}{translateUi(i + 1)}{i === 4 ? translateUi(' · Deliver here') : translateUi('')}</span><strong>{word || translateUi('Choose a place ↑')}</strong></button>
    </li>)}</ol></div>
  </section>;
}

export function PostalDelivery({ route }) {
  return <div className="pr-delivery" aria-label={translateUi("Delivery complete: the letter has reached the final stop")}>
    <svg viewBox="0 0 300 48" role="img" aria-label={translateUi("The last letter travels along your completed route")}><path d="M20 38H280" stroke="#9ebbb5" strokeWidth="3" />{route.map((word, i) => <circle key={word} cx={20 + i * 65} cy="38" r="5" fill="#2d6256" />)}<g className="pr-letter"><rect x="10" y="5" width="20" height="15" rx="2" fill="#fffdf8" stroke="#ad3425" strokeWidth="2" /><path d="M10 6L20 14 30 6" fill="none" stroke="#ad3425" strokeWidth="2" /></g></svg>
    <ol>{route.map((word) => <li key={word}>{translateUi(word)}</li>)}</ol>
  </div>;
}
