import { useEffect, useState } from 'react';
import { analyticsAvailable, analyticsChoice, basicAnalyticsAllowed, saveAnalyticsPreferences, analyticsLocationAllowed } from './analytics.js';
import { useModalFocus } from './useModalFocus.js';

export function AnalyticsChoices() {
  const available = analyticsAvailable() && analyticsLocationAllowed();
  const [choice, setChoice] = useState(analyticsChoice);
  const [basic, setBasic] = useState(basicAnalyticsAllowed);
  const [open, setOpen] = useState(choice === null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const dialogRef = useModalFocus(available && mounted && open, () => {
    if (choice === null) choose('denied');
    else setOpen(false);
  });
  // Static pages render only App. Keep the hydration pass identical, then
  // reveal the consent control after the client has mounted.
  if (!available || !mounted) return null;

  function choose(value) {
    saveAnalyticsPreferences({basic,enhanced:value});
    setChoice(value);
    setOpen(false);
  }

  return <>
    <button type="button" className="analytics-choice-trigger" onClick={() => setOpen(true)}>Privacy choices</button>
    {open && <div className="analytics-choice-overlay" role="presentation">
      <section ref={dialogRef} tabIndex={-1} className="analytics-choice-dialog" role="dialog" aria-modal="true" aria-labelledby="analytics-choice-title">
        <h2 id="analytics-choice-title">Your privacy choices</h2>
        <p>Ahrefs and Plausible count basic traffic without cookies. Google Analytics cookies and Clarity session recordings need your permission.</p>
        <p>Private pages are excluded. Change your choice anytime. <a href="/en/cookies/">Privacy details</a>.</p>
        <label className="analytics-basic-choice"><input type="checkbox" aria-label="Include basic traffic statistics (Ahrefs and Plausible)" checked={basic} onChange={event=>setBasic(event.target.checked)} /> Basic traffic statistics</label>
        <div className="analytics-choice-actions">
          <button type="button" className="button-quiet" aria-label="Decline enhanced analytics" onClick={() => choose('denied')}>Decline enhanced</button>
          <button type="button" className="button" aria-label="Allow enhanced analytics" onClick={() => choose('granted')}>Allow enhanced</button>
        </div>
      </section>
    </div>}
  </>;
}
