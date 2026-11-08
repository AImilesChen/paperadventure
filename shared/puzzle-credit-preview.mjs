// Local UX prototype only. Real balances and entitlements must live on the server.
import { freePuzzles } from './free-puzzles.mjs';
import { bayEdition } from './loading-bay.mjs';
import { stampEdition } from './stamp-investigation.mjs';
export const creditPreviewKey = 'paw-puzzle-credit-preview-v1';
export const previewStartingBalance = 8;
export const helpPrices = Object.freeze({ 'hint-1': 0, 'hint-2': 1, 'hint-3': 2, solution: 5 });
const ids = freePuzzles.map(p => p.id);
export const helpName = kind => kind === 'solution' ? 'Full solution' : `Hint ${kind.split('-')[1]}`;
export function helpKey(id, kind) {
  if (!ids.includes(id) || !Object.hasOwn(helpPrices, kind)) return null;
  return `${id}@${id === 'stamp-code' ? stampEdition : id === 'parcel-queue' ? bayEdition : 1}:${kind}`;
}
const allowedKeys = new Set(ids.flatMap(id => Object.keys(helpPrices).map(kind => helpKey(id, kind))));
export function freshCreditPreview() { return { version: 1, balance: previewStartingBalance, unlocked: [], history: [], sequence: 0 }; }
export function restoreCreditPreview(raw) {
  if (raw?.version !== 1 || !Number.isSafeInteger(raw.balance) || raw.balance < 0 || raw.balance > 10000) return freshCreditPreview();
  return {
    version: 1, balance: raw.balance,
    unlocked: Array.isArray(raw.unlocked) ? [...new Set(raw.unlocked.map(key => typeof key === 'string' ? key.replace('stamp-code@3:', `stamp-code@${stampEdition}:`) : key).filter(key => allowedKeys.has(key)))] : [],
    history: Array.isArray(raw.history) ? raw.history.slice(-100).filter(row => row && Number.isSafeInteger(row.sequence) && row.sequence > 0 && Number.isSafeInteger(row.cost) && row.cost >= 0 && row.cost <= 5 && Number.isSafeInteger(row.balance) && row.balance >= 0 && row.balance <= 10000 && (row.kind === 'demo-reset' || helpKey(row.puzzle, row.kind))).map(row => ({ sequence: row.sequence, ...(row.puzzle ? { puzzle: row.puzzle } : {}), kind: row.kind, cost: row.cost, balance: row.balance })) : [],
    sequence: Number.isSafeInteger(raw.sequence) && raw.sequence >= 0 ? raw.sequence : 0,
  };
}
export function rememberOpenedHelp(wallet, workshop) {
  const unlocked = new Set(wallet.unlocked);
  for (const id of ids) {
    const item = workshop?.items?.[id];
    for (let hint = 1; hint <= Math.min(3, Math.max(item?.hints || 0, item?.routeHints || 0)); hint++) unlocked.add(helpKey(id, `hint-${hint}`));
    if (item?.viewed) unlocked.add(helpKey(id, 'solution'));
  }
  return { ...wallet, unlocked: [...unlocked] };
}
export function quoteHelp(wallet, id, kind, completed = false) {
  const key = helpKey(id, kind);
  if (!key) return { ok: false, reason: 'unknown-help' };
  const owned = wallet.unlocked.includes(key) || kind !== 'solution' && wallet.unlocked.includes(helpKey(id, 'solution'));
  const earned = kind === 'solution' && completed;
  const cost = owned || earned ? 0 : helpPrices[kind];
  return { ok: true, key, owned, earned, cost, balance: wallet.balance, remaining: wallet.balance - cost, affordable: wallet.balance >= cost };
}
export function unlockPreviewHelp(wallet, id, kind, completed = false) {
  const quote = quoteHelp(wallet, id, kind, completed);
  if (!quote.ok) return { ok: false, wallet, reason: quote.reason };
  if (!quote.affordable) return { ok: false, wallet, reason: 'insufficient-credits', quote };
  if (quote.owned) return { ok: true, wallet, quote, charged: 0 };
  const sequence = wallet.sequence + 1, balance = wallet.balance - quote.cost;
  return { ok: true, charged: quote.cost, quote, wallet: { ...wallet, balance, sequence, unlocked: [...new Set([...wallet.unlocked, ...(kind === 'solution' ? Object.keys(helpPrices).map(level => helpKey(id, level)) : [quote.key])])], history: [...wallet.history, { sequence, puzzle: id, kind, cost: quote.cost, balance }].slice(-100) } };
}
export function resetDemoBalance(wallet) {
  const sequence = wallet.sequence + 1;
  return { ...wallet, balance: previewStartingBalance, sequence, history: [...wallet.history, { sequence, kind: 'demo-reset', cost: 0, balance: previewStartingBalance }].slice(-100) };
}
