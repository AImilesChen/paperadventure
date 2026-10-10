import { useEffect, useState } from 'react';
import { ArrowRight, ArrowLeft } from '@phosphor-icons/react';
import { themes, offerFor, formatUsd } from '../shared/catalog.mjs';
import { CustomCreateIntro, CustomCreateAfterform } from './customCreateContent.jsx';
import './livePages.css';

export function LiveCreate({ Link, checkoutReady, checkoutMode, runtimeOffers }) {
  const query = new URLSearchParams(window.location.search);
  const saved = (() => { try { const value = JSON.parse(localStorage.getItem('paw-draft') || '{}'); return value && typeof value === 'object' && !Array.isArray(value) ? value : {}; } catch { return {}; } })();
  const [draft, setDraft] = useState({ theme: query.get('theme') || saved.theme || '', custom: query.has('custom') || saved.custom || false, idea: saved.idea || '', setting: query.get('setting') || saved.setting || '', players: saved.players || '', groups: saved.groups || '', age: saved.age || '', paper: saved.paper || 'A4', place: saved.place || '', reading: saved.reading || '', materials: saved.materials || '', direction: saved.direction || '', proposalTitle: saved.proposalTitle || '', proposalSummary: saved.proposalSummary || '' });
  const [step, setStep] = useState(1); const [proposals, setProposals] = useState([]); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const [cloudSaved, setCloudSaved] = useState(false);
  const [signedIn, setSignedIn] = useState(null);
  useEffect(() => {
    let active = true;
    fetch('/api/v1/auth/session', { credentials: 'same-origin' })
      .then(response => response.ok ? response.json() : null)
      .then(session => { if (active) setSignedIn(Boolean(session?.authenticated)); })
      .catch(() => { if (active) setSignedIn(false); });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (query.has('theme') || query.has('custom') || query.has('setting') || saved.theme || saved.idea) return;
    fetch('/api/v1/my-draft').then(response => response.ok ? response.json() : null).then(data => {
      if (data?.draft) setDraft(current => ({ ...current, theme: data.draft.themeId || '', custom: !data.draft.themeId, idea: data.draft.customIdea || '', setting: data.draft.setting, players: data.draft.players, groups: data.draft.groups || '', age: data.draft.age, paper: data.draft.paper, place: data.draft.place || '', reading: data.draft.reading || '', materials: data.draft.materials || '', direction: data.draft.direction, proposalTitle: data.draft.proposalTitle || '', proposalSummary: data.draft.proposalSummary || '' }));
    }).catch(() => {});
  }, []);
  const change = (key, value) => {
    const changesStory = key !== 'direction';
    setDraft(current => ({ ...current, groups: key === 'setting' && value === 'home' ? '' : current.groups, [key]: value, direction: changesStory ? '' : value, proposalTitle: changesStory ? '' : current.proposalTitle, proposalSummary: changesStory ? '' : current.proposalSummary }));
    if (changesStory) setProposals([]);
    setCloudSaved(false);
    setError('');
  };
  const useExampleIdea = idea => {
    setDraft(current => ({ ...current, idea, custom: true, theme: '', direction: '', proposalTitle: '', proposalSummary: '' }));
    setProposals([]); setCloudSaved(false); setError('');
  };
  async function previewIdeas() {
    setBusy(true); setError('');
    setProposals([]);
    setDraft(current => ({ ...current, direction: '', proposalTitle: '', proposalSummary: '' }));
    try {
      const response = await fetch('/api/v1/proposals', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ themeId: draft.custom ? null : draft.theme, customIdea: draft.custom ? draft.idea : null, setting: draft.setting, players: draft.players, groups: draft.groups, age: draft.age, paper: draft.paper, place: draft.place, reading: draft.reading, materials: draft.materials }) });
      const body = await response.json();
      if (!response.ok) { if (response.status === 401) throw new Error('Sign in with Google to preview story ideas.'); throw new Error(body.error?.message || 'Story ideas are temporarily unavailable.'); }
      setProposals(body.proposals); setStep(3);
    } catch (failure) { setError(failure.message); } finally { setBusy(false); }
  }
  function review() {
    try { localStorage.setItem('paw-draft', JSON.stringify(draft)); } catch { /* Account draft storage can still succeed. */ }
    setStep(4);
    fetch('/api/v1/my-draft', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ themeId: draft.custom ? null : draft.theme, customIdea: draft.custom ? draft.idea : null, setting: draft.setting, players: draft.players, groups: draft.groups, age: draft.age, paper: draft.paper, place: draft.place, reading: draft.reading, materials: draft.materials, direction: draft.direction, proposalTitle: draft.proposalTitle, proposalSummary: draft.proposalSummary }) })
      .then(response => { if (response.ok) setCloudSaved(true); }).catch(() => {});
  }
  const validWorld = draft.custom ? draft.idea.trim().length > 0 : Boolean(draft.theme);
  const customOffer = runtimeOffers?.find(item => item.sku === `custom_${draft.setting}`) || offerFor('custom', draft.setting);
  const players = Number(draft.players);
  const groups = Number(draft.groups);
  const validSetup = ['home','classroom'].includes(draft.setting) && Number.isInteger(players) && players >= 2 && players <= (draft.setting === 'classroom' ? 35 : 12) && /^(?:[6-9]|1[0-2])(?:\s*[-–]\s*(?:[6-9]|1[0-2]))?$/.test(draft.age.trim()) && (draft.setting !== 'classroom' || (Number.isInteger(groups) && groups >= 1 && groups <= players));
  return <main className="extended-page live-page"><CustomCreateIntro Link={Link} /><div id="start" className="custom-create-form-heading"><span className="eyebrow">YOUR ADVENTURE STARTS HERE</span><h2>Tell us what to make.</h2><p>Choose a story world or add your own idea. Your choices stay editable until you review the plan.</p><p className="custom-create-prices">Free direction preview · Custom Home {formatUsd((runtimeOffers?.find(item => item.sku === "custom_home") || offerFor("custom", "home")).unitAmount)} · Custom Classroom {formatUsd((runtimeOffers?.find(item => item.sku === "custom_classroom") || offerFor("custom", "classroom")).unitAmount)} before applicable tax</p></div><section className="live-shell"><div className="live-panel"><div className="live-stepper" aria-label="Creation progress">{['Story world','Your setup','Choose direction','Review'].map((label,index) => <span key={label} className={step === index + 1 ? 'current' : ''} aria-current={step === index + 1 ? 'step' : undefined}>{index + 1}. {label}</span>)}</div>{checkoutMode === 'test' && <p className="custom-create-test-note">This site currently uses Stripe test checkout. You can explore the full order flow without a real charge.</p>}
    {step === 1 && <><h2>What kind of world?</h2><p className="custom-create-form-hint">Pick a familiar world or write a new place, creature or friendly mystery below.</p><div className="live-theme-grid">{themes.map(theme => <button key={theme.id} className={!draft.custom && draft.theme === theme.id ? 'selected' : ''} onClick={() => { setDraft(current => ({ ...current, theme: theme.id, custom: false, idea: '', direction: '', proposalTitle: '', proposalSummary: '' })); setProposals([]); setCloudSaved(false); setError(''); }}><img src={theme.image} alt="" /><strong>{theme.title}</strong></button>)}</div><label>Your own idea<textarea maxLength={400} value={draft.idea} onChange={event => { setDraft(current => ({ ...current, idea: event.target.value, custom: true, theme: '', direction: '' })); setProposals([]); setCloudSaved(false); setError(''); }} placeholder="A friendly mystery in an underwater library…" /></label><div className="custom-create-prompt-list" aria-label="Example ideas">{['A friendly mystery in an underwater library', 'A lost map in a floating garden'].map(idea => <button key={idea} type="button" onClick={() => useExampleIdea(idea)}>Try: {idea}</button>)}</div><p className="small-muted">Please leave out children's names and other personal details.</p><button className="button" disabled={!validWorld} onClick={() => setStep(2)}>Continue <ArrowRight size={18} /></button></>}
    {step === 2 && <><h2>Who will play?</h2><p className="custom-create-form-hint">Home: 2–12 players. Classroom: 2–35 students. Choose ages within 6–12; a teacher can divide students into groups.</p><div className="live-form-grid"><label>Setting<select value={draft.setting} onChange={event => change('setting', event.target.value)}><option value="">Choose Home or Classroom</option><option value="home">Home</option><option value="classroom">Classroom</option></select></label><label>Players or students<input type="number" min="2" max={draft.setting === 'classroom' ? '35' : '12'} step="1" value={draft.players} onChange={event => change('players', event.target.value)} /></label>{draft.setting === 'classroom' && <label>Groups<input type="number" min="1" step="1" value={draft.groups} onChange={event => change('groups', event.target.value)} /></label>}<label>Age range (6–12)<input maxLength={40} value={draft.age} onChange={event => change('age', event.target.value)} placeholder="e.g. 8–10" /></label><label>Paper<select value={draft.paper} onChange={event => change('paper', event.target.value)}><option value="A4">A4</option><option value="Letter">US Letter</option></select></label><label>Place (optional)<input maxLength={180} value={draft.place} onChange={event => change('place', event.target.value)} /></label></div>{signedIn === false && <p className="custom-create-setup-guide">Google sign-in is needed for the free story preview. <Link className="custom-create-inline-link" to="/en/account/?returnTo=%2Fen%2Fcreate%2F">Sign in now</Link>, or finish these choices first.</p>}<div className="live-actions"><button className="button-quiet" onClick={() => setStep(1)}><ArrowLeft size={16} /> Back</button><button className="button" disabled={!validSetup || busy} onClick={previewIdeas}>{busy ? 'Preparing ideas…' : 'Preview two story ideas'} <ArrowRight size={18} /></button></div></>}
    {step === 3 && <><h2>Choose a direction</h2><p>These are short story previews, with no puzzles or complete game included. Choose one to review before checkout.</p><div className="live-proposals">{proposals.map(item => <button key={item.id} className={draft.direction === item.id ? 'selected' : ''} onClick={() => { setDraft(current => ({ ...current, direction: item.id, proposalTitle: item.title, proposalSummary: item.summary })); setCloudSaved(false); setError(''); }}><strong>{item.title}</strong><span>{item.summary}</span></button>)}</div><div className="live-actions"><button className="button-quiet" onClick={() => setStep(2)}><ArrowLeft size={16} /> Back</button><button className="button" disabled={!draft.direction} onClick={review}>Review choices <ArrowRight size={18} /></button></div></>}
    {step === 4 && <><h2>Your plan</h2><dl className="live-review"><div><dt>World</dt><dd>{draft.custom ? draft.idea : themes.find(theme => theme.id === draft.theme)?.title}</dd></div><div><dt>Setting</dt><dd>{draft.setting}</dd></div><div><dt>Players</dt><dd>{draft.players}</dd></div><div><dt>Paper</dt><dd>{draft.paper}</dd></div><div><dt>Direction</dt><dd>{draft.proposalTitle || draft.direction}</dd></div></dl>{customOffer && <div className="custom-create-review-price"><strong>{checkoutMode === 'test' ? 'Test price' : 'Price before applicable tax'}: {formatUsd(customOffer.unitAmount)}</strong><span>{checkoutMode === 'test' ? 'Stripe test checkout does not take real money.' : 'The final total, including applicable tax, appears in Stripe before payment.'}</span></div>}{checkoutReady ? <Link className="button" to={`/en/checkout/?kind=custom&setting=${draft.setting}`}>{checkoutMode === 'test' ? 'Continue to Stripe test checkout' : 'Review price and continue'} <ArrowRight size={18} /></Link> : <p>Checkout is not open yet. Your planning draft is saved on this device.</p>}{cloudSaved && <p role="status">Your draft is also saved to your verified adult account.</p>}<button className="button-quiet" onClick={() => setStep(3)}>Edit direction</button></>}
    {error && <p className="live-alert" role="alert">{error} {error.startsWith('Sign in with Google') && <Link to="/en/account/">Open Google sign-in</Link>}</p>}
  </div></section><CustomCreateAfterform Link={Link} /></main>;
}
