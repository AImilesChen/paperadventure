import { useEffect, useState } from 'react';
import { analyticsAvailable, analyticsChoice, saveAnalyticsChoice } from './analytics.js';
import { useModalFocus } from './useModalFocus.js';

export function AnalyticsChoices() {
  const available = analyticsAvailable();
  const [choice, setChoice] = useState(analyticsChoice);
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
    saveAnalyticsChoice(value);
    setChoice(value);
    setOpen(false);
  }

  return <>
    <button type="button" className="analytics-choice-trigger" onClick={() => setOpen(true)}>Privacy choices</button>
    {open && <div className="analytics-choice-overlay" role="presentation">
      <section ref={dialogRef} tabIndex={-1} className="analytics-choice-dialog" role="dialog" aria-modal="true" aria-labelledby="analytics-choice-title">
        <h2 id="analytics-choice-title">Choose whether to share usage data</h2>
        <p>With your permission, Google Analytics 4, Microsoft Clarity, Ahrefs Web Analytics and Plausible help us understand visits to public information pages. Their scripts may receive page URLs, browser and network details, and interaction data; Clarity can record sessions. We keep these scripts off the creator, checkout, account, order and private support pages. Our custom events do not include story ideas, email addresses or player details.</p>
        <p>You can decline and still use this preview. Change your choice here at any time.</p>
        <div className="analytics-choice-actions">
          <button type="button" className="button-quiet" onClick={() => choose('denied')}>Decline analytics</button>
          <button type="button" className="button" onClick={() => choose('granted')}>Allow analytics</button>
        </div>
      </section>
    </div>}
  </>;
}
