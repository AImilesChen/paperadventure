import { useEffect, useState } from 'react';
import { ArrowRight, ArrowLeft, Sparkle } from '@phosphor-icons/react';
import { themes } from '../shared/catalog.mjs';
import './livePages.css';

export function LiveCreate({ Link, checkoutReady, checkoutMode }) {
  const query = new URLSearchParams(window.location.search);
  const saved = (() => { try { const value = JSON.parse(localStorage.getItem('paw-draft') || '{}'); return value && typeof value === 'object' && !Array.isArray(value) ? value : {}; } catch { return {}; } })();
  const [draft, setDraft] = useState({ theme: query.get('theme') || saved.theme || '', custom: query.has('custom') || saved.custom || false, idea: saved.idea || '', setting: query.get('setting') || saved.setting || '', players: saved.players || '', groups: saved.groups || '', age: saved.age || '', paper: saved.paper || 'A4', place: saved.place || '', reading: saved.reading || '', materials: saved.materials || '', direction: saved.direction || '' });
  const [step, setStep] = useState(1); const [proposals, setProposals] = useState([]); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const [cloudSaved, setCloudSaved] = useState(false);
  useEffect(() => {
    if (query.has('theme') || query.has('custom') || query.has('setting') || saved.theme || saved.idea) return;
    fetch('/api/v1/my-draft').then(response => response.ok ? response.json() : null).then(data => {
      if (data?.draft) setDraft(current => ({ ...current, theme: data.draft.themeId || '', custom: !data.draft.themeId, idea: data.draft.customIdea || '', setting: data.draft.setting, players: data.draft.players, groups: data.draft.groups || '', age: data.draft.age, paper: data.draft.paper, place: data.draft.place || '', reading: data.draft.reading || '', materials: data.draft.materials || '', direction: data.draft.direction }));
    }).catch(() => {});
  }, []);
  const change = (key, value) => {
    const changesStory = key !== 'direction';
    setDraft(current => ({ ...current, groups: key === 'setting' && value === 'home' ? '' : current.groups, [key]: value, direction: changesStory ? '' : value }));
    if (changesStory) setProposals([]);
    setCloudSaved(false);
    setError('');
  };
  async function previewIdeas() {
    setBusy(true); setError('');
    setProposals([]);
    setDraft(current => ({ ...current, direction: '' }));
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
    fetch('/api/v1/my-draft', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ themeId: draft.custom ? null : draft.theme, customIdea: draft.custom ? draft.idea : null, setting: draft.setting, players: draft.players, groups: draft.groups, age: draft.age, paper: draft.paper, place: draft.place, reading: draft.reading, materials: draft.materials, direction: draft.direction }) })
      .then(response => { if (response.ok) setCloudSaved(true); }).catch(() => {});
  }
  const validWorld = draft.custom ? draft.idea.trim().length > 0 : Boolean(draft.theme);
  const players = Number(draft.players);
  const groups = Number(draft.groups);
  const validSetup = ['home','classroom'].includes(draft.setting) && Number.isInteger(players) && players >= 2 && players <= (draft.setting === 'classroom' ? 35 : 12) && /^(?:[6-9]|1[0-2])(?:\s*[-–]\s*(?:[6-9]|1[0-2]))?$/.test(draft.age.trim()) && (draft.setting !== 'classroom' || (Number.isInteger(groups) && groups >= 1 && groups <= players));
  return <main className="extended-page live-page"><section className="page-intro extended-intro"><span className="eyebrow"><Sparkle size={16} /> CREATE AN ADVENTURE</span><h1>Shape the story together.</h1><p>Sign in with Google to preview up to two short directions per day for free. A complete printable game starts only after confirmed payment.</p></section><section className="live-shell"><div className="live-panel"><div className="live-stepper">{['Story world','Your setup','Choose direction','Review'].map((label,index) => <span key={label} className={step === index + 1 ? 'current' : ''}>{index + 1}. {label}</span>)}</div>
    {step === 1 && <><h2>What kind of world?</h2><div className="live-theme-grid">{themes.map(theme => <button key={theme.id} className={!draft.custom && draft.theme === theme.id ? 'selected' : ''} onClick={() => { setDraft(current => ({ ...current, theme: theme.id, custom: false, idea: '', direction: '' })); setProposals([]); setCloudSaved(false); setError(''); }}><img src={theme.image} alt="" /><strong>{theme.title}</strong></button>)}</div><label>Your own idea<textarea maxLength={400} value={draft.idea} onChange={event => { setDraft(current => ({ ...current, idea: event.target.value, custom: true, theme: '', direction: '' })); setProposals([]); setCloudSaved(false); setError(''); }} placeholder="A friendly mystery in an underwater library…" /></label><p className="small-muted">Please leave out children's names and other personal details.</p><button className="button" disabled={!validWorld} onClick={() => setStep(2)}>Continue <ArrowRight size={18} /></button></>}
    {step === 2 && <><h2>Who will play?</h2><div className="live-form-grid"><label>Setting<select value={draft.setting} onChange={event => change('setting', event.target.value)}><option value="">Choose Home or Classroom</option><option value="home">Home</option><option value="classroom">Classroom</option></select></label><label>Players or students<input type="number" min="2" max={draft.setting === 'classroom' ? '35' : '12'} step="1" value={draft.players} onChange={event => change('players', event.target.value)} /></label>{draft.setting === 'classroom' && <label>Groups<input type="number" min="1" step="1" value={draft.groups} onChange={event => change('groups', event.target.value)} /></label>}<label>Age range (6–12)<input maxLength={40} value={draft.age} onChange={event => change('age', event.target.value)} placeholder="e.g. 8–10" /></label><label>Paper<select value={draft.paper} onChange={event => change('paper', event.target.value)}><option value="A4">A4</option><option value="Letter">US Letter</option></select></label><label>Place (optional)<input maxLength={180} value={draft.place} onChange={event => change('place', event.target.value)} /></label></div><div className="live-actions"><button className="button-quiet" onClick={() => setStep(1)}><ArrowLeft size={16} /> Back</button><button className="button" disabled={!validSetup || busy} onClick={previewIdeas}>{busy ? 'Preparing ideas…' : 'Preview two story ideas'} <ArrowRight size={18} /></button></div></>}
    {step === 3 && <><h2>Choose a direction</h2><p>These are short previews, with no puzzles or complete game included.</p><div className="live-proposals">{proposals.map(item => <button key={item.id} className={draft.direction === item.id ? 'selected' : ''} onClick={() => change('direction', item.id)}><strong>{item.title}</strong><span>{item.summary}</span></button>)}</div><div className="live-actions"><button className="button-quiet" onClick={() => setStep(2)}><ArrowLeft size={16} /> Back</button><button className="button" disabled={!draft.direction} onClick={review}>Review choices <ArrowRight size={18} /></button></div></>}
    {step === 4 && <><h2>Your plan</h2><dl className="live-review"><div><dt>World</dt><dd>{draft.custom ? draft.idea : themes.find(theme => theme.id === draft.theme)?.title}</dd></div><div><dt>Setting</dt><dd>{draft.setting}</dd></div><div><dt>Players</dt><dd>{draft.players}</dd></div><div><dt>Paper</dt><dd>{draft.paper}</dd></div><div><dt>Direction</dt><dd>{proposals.find(item => item.id === draft.direction)?.title || draft.direction}</dd></div></dl>{checkoutReady ? <Link className="button" to={`/en/checkout/?kind=custom&setting=${draft.setting}`}>{checkoutMode === 'test' ? 'Continue to Stripe test checkout' : 'Review price and continue'} <ArrowRight size={18} /></Link> : <p>Checkout is not open yet. Your planning draft is saved on this device.</p>}{cloudSaved && <p role="status">Your draft is also saved to your verified adult account.</p>}<button className="button-quiet" onClick={() => setStep(3)}>Edit direction</button></>}
    {error && <p className="live-alert" role="alert">{error} {error.startsWith('Sign in with Google') && <Link to="/en/account/">Open Google sign-in</Link>}</p>}
  </div></section></main>;
}
