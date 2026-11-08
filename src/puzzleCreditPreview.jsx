import { useEffect, useRef, useState } from 'react';
import { creditPreviewKey, helpName, freshCreditPreview, restoreCreditPreview, rememberOpenedHelp, quoteHelp, unlockPreviewHelp, resetDemoBalance } from '../shared/puzzle-credit-preview.mjs';
import { freePuzzles } from '../shared/free-puzzles.mjs';
import './puzzleCreditPreview.css';
const creditLabel = value => `${value} credit${value === 1 ? '' : 's'}`;

export function useCreditPreview(enabled, workshopReady, workshop) {
  const [wallet, setWallet] = useState(freshCreditPreview);
  const current = useRef(wallet);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState('saved');
  const loaded = useRef(false);
  function commit(next) {
    current.current = next; setWallet(next);
    try { localStorage.setItem(creditPreviewKey, JSON.stringify(next)); setSaving('saved'); }
    catch { setSaving('unavailable'); }
  }
  useEffect(() => {
    if (!enabled || !workshopReady || loaded.current) return;
    loaded.current = true;
    let saved = freshCreditPreview();
    try { const raw = localStorage.getItem(creditPreviewKey); if (raw) saved = restoreCreditPreview(JSON.parse(raw)); } catch { setSaving('unavailable'); }
    commit(rememberOpenedHelp(saved, workshop)); setReady(true);
  }, [enabled, workshopReady]);
  return {
    wallet, ready, saving,
    quote: (id, kind, completed) => quoteHelp(current.current, id, kind, completed),
    unlock(id, kind, completed) {
      if (!ready) return { ok: false, reason: 'loading' };
      // Update the ref synchronously: two clicks in one render cannot charge twice.
      const result = unlockPreviewHelp(current.current, id, kind, completed);
      if (result.ok && result.wallet !== current.current) commit(result.wallet);
      return result;
    },
    resetBalance: () => commit(resetDemoBalance(current.current)),
  };
}

export default function CreditHelp({ puzzle, item, credits, grant, renderSolution }) {
  const [panel, setPanel] = useState(null);
  const [error, setError] = useState('');
  const dialog = useRef(null);
  const nextKind = `hint-${Math.min(3, item.hints + 1)}`;
  const next = credits.quote(puzzle.id, nextKind, Boolean(item.completion));
  const solution = credits.quote(puzzle.id, 'solution', Boolean(item.completion));
  const selectedQuote = panel?.kind ? credits.quote(puzzle.id, panel.kind, Boolean(item.completion)) : null;
  useEffect(() => {
    if (panel && !dialog.current.open) dialog.current.showModal();
    if (!panel && dialog.current.open) dialog.current.close();
  }, [panel]);
  function reveal(kind) {
    const result = credits.unlock(puzzle.id, kind, Boolean(item.completion));
    if (!result.ok) { setError(result.reason === 'insufficient-credits' ? 'There are not enough demo credits. No credits were deducted.' : 'Demo credits are still loading. Try again shortly.'); return; }
    grant(kind); setError(''); setPanel({ mode: 'read', kind });
  }
  function request(kind) {
    const quote = credits.quote(puzzle.id, kind, Boolean(item.completion));
    setError('');
    // A solution always has an explicit disclosure step, even when already owned.
    if (quote.cost === 0 && kind !== 'solution') reveal(kind);
    else setPanel({ mode: 'confirm', kind });
  }
  const close = () => { setPanel(null); setError(''); };
  const priceLabel = quote => quote?.owned ? 'unlocked' : quote?.earned ? 'earned' : quote?.cost ? `${quote.cost} credit${quote.cost === 1 ? '' : 's'}` : 'Free';
  return <div className="pc-help">
    <button className="pc-balance" disabled={!credits.ready} onClick={() => setPanel({ mode: 'wallet' })}><strong>{credits.ready ? `${credits.wallet.balance} demo credit${credits.wallet.balance === 1 ? '' : 's'}` : 'Loading demo credits…'}</strong><small>No real payment</small></button>
    <button disabled={!credits.ready || item.hints >= 3 || Boolean(item.completion)} onClick={() => request(nextKind)}>{item.hints >= 3 ? 'All hints opened' : `Hint ${item.hints + 1} · ${nextKind === 'hint-1' ? 'Free' : priceLabel(next)}`}</button>
    <button disabled={!credits.ready} onClick={() => request('solution')}>Full solution · {priceLabel(solution)}</button>
    {(item.hints > 0 || item.viewed) && <button className="pc-read" onClick={() => setPanel({ mode: 'read', kind: item.viewed ? 'solution' : `hint-${item.hints}` })}>Read opened help</button>}
    <dialog ref={dialog} className="pc-dialog" aria-labelledby={`pc-title-${puzzle.id}`} onCancel={close} onClose={close}>
      <div><header><div><span className="pc-kicker">DEMO CREDITS · NO REAL MONEY</span><h2 id={`pc-title-${puzzle.id}`}>{panel?.mode === 'wallet' ? 'Your demo credits' : panel?.mode === 'packs' ? 'Credit packs are planned' : panel?.mode === 'confirm' ? `Unlock ${helpName(panel.kind).toLowerCase()}?` : panel?.kind === 'solution' ? 'Explained solution' : 'Your opened hints'}</h2></div><button aria-label="Close help dialog" onClick={close}>Close</button></header>
      {panel?.mode === 'confirm' && <>
        <p>{panel.kind === 'solution' ? item.completion ? 'You already solved this puzzle. Reading its explanation does not change your completion.' : 'This reveals the complete answer and includes all three hints for this edition. A later completion will be marked as after viewing the solution.' : 'This opens one further hint. You can keep trying before you unlock it.'}</p>
        {puzzle.id === 'shared-parcel' && panel.kind === 'solution' && <p className="pc-note"><strong>Includes:</strong> the correct parcel and false note, all seven deductions, rejected map locations, and the restored ledger. Earlier hint spending counts toward the 5-credit total. Already spent on this edition: {creditLabel(selectedQuote.paidBefore)}.</p>}
        <dl className="pc-quote"><div><dt>Cost now</dt><dd>{creditLabel(selectedQuote.cost)}</dd></div><div><dt>Your balance</dt><dd>{creditLabel(selectedQuote.balance)}</dd></div><div><dt>After unlocking</dt><dd>{selectedQuote.affordable ? creditLabel(selectedQuote.remaining) : 'Insufficient'}</dd></div></dl>
        <p className="pc-note">{selectedQuote.owned ? 'Already unlocked for this puzzle edition. Opening it again costs nothing.' : selectedQuote.earned ? 'You already solved this puzzle. Reading its explanation is free.' : 'One unlock for this puzzle edition. Reopening it or restarting the puzzle will not charge again.'}</p>
        {!selectedQuote.affordable && <p className="pc-error" role="status">You need {selectedQuote.cost - selectedQuote.balance} more demo credit{selectedQuote.cost - selectedQuote.balance === 1 ? '' : 's'}. Nothing has been deducted.</p>}
        <p className="pc-error" role="status">{error}</p><div className="pc-dialog-actions"><button onClick={close}>Keep solving</button><button className="pw-check" disabled={!selectedQuote.affordable} onClick={() => reveal(panel.kind)}>{selectedQuote.cost ? `Unlock for ${creditLabel(selectedQuote.cost)}` : 'Show solution · no charge'}</button>{!selectedQuote.affordable && <button onClick={() => setPanel({ mode: 'packs' })}>About credit packs</button>}</div>
      </>}
      {panel?.mode === 'read' && <>
        {panel.kind === 'solution' ? <><p>{puzzle.id !== 'shared-parcel' && <><strong>{puzzle.answer}.</strong> </>}{puzzle.solution}</p>{renderSolution?.()}<p className="pc-note">Reading an explanation does not fill or complete the puzzle for you.</p></> : <ol className="puzzle-hints">{puzzle.hints.slice(0, Math.max(item.hints, Number(panel.kind.split('-')[1]))).map((hint, i) => <li key={i}><strong>Hint {i + 1}</strong><p>{hint}</p></li>)}</ol>}
        <div className="pc-dialog-actions"><button className="pw-check" onClick={close}>Return to the puzzle</button></div>
      </>}
      {panel?.mode === 'wallet' && <>
        <p className="pc-wallet-number">{credits.wallet.balance} <span>demo credit{credits.wallet.balance === 1 ? '' : 's'}</span></p><p>Sample credits for testing this local preview. They were not purchased, have no cash value and are saved only in this browser.</p><p>Hint 1 is free. Hint 2 costs 1 credit, hint 3 costs 2, and a full solution costs 5, including all three hints. For the parcel investigation, earlier hint spending is credited toward a maximum total of 5 credits for the complete explanation. These are preview settings, not a published price list.</p><p>Restarting or clearing puzzle progress keeps previously unlocked help. A new puzzle edition may have different help.</p>
        {credits.saving === 'unavailable' && <p className="pc-error" role="status">Browser saving is unavailable. This demo balance and unlocks may be lost on reload.</p>}
        <h3>Demo activity</h3>{credits.wallet.history.length ? <ol className="pc-history">{credits.wallet.history.slice(-8).reverse().map(row => <li key={row.sequence}>{row.kind === 'demo-reset' ? 'Demo balance reset' : `${freePuzzles.find(p => p.id === row.puzzle)?.title || 'Puzzle'} · ${helpName(row.kind)} · ${row.cost ? `−${row.cost}` : 'Free'}`}<span>Balance {row.balance}</span></li>)}</ol> : <p>No unlocks yet.</p>}
        <div className="pc-dialog-actions"><button onClick={() => setPanel({ mode: 'packs' })}>About credit packs</button><button onClick={() => setPanel({ mode: 'reset' })}>Reset demo balance</button></div>
      </>}
      {panel?.mode === 'reset' && <><p>Restore the sample balance to 8 demo credits? Your unlocked hints and solutions remain available. This does not create a payment or add real account credits.</p><div className="pc-dialog-actions"><button onClick={() => setPanel({ mode: 'wallet' })}>Cancel</button><button onClick={() => { credits.resetBalance(); setPanel({ mode: 'wallet' }); }}>Restore 8 demo credits</button></div></>}
      {panel?.mode === 'packs' && <><p>Credit packs are not on sale in this preview. Pack sizes, prices and any introductory credits have not been set. No payment details are requested.</p><p>You can keep solving, use the free direction hint, or reset the sample balance to try another part of this demo. The existing free printable guide remains available.</p><div className="pc-dialog-actions"><button onClick={() => setPanel({ mode: 'wallet' })}>Back to demo balance</button><button onClick={close}>Keep solving</button></div></>}
      </div>
    </dialog>
  </div>;
}
