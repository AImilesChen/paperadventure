import { useState } from 'react';
import { analyticsAvailable, analyticsChoice, saveAnalyticsChoice } from './analytics.js';

export function AnalyticsChoices() {
  const available = analyticsAvailable();
  const [choice, setChoice] = useState(analyticsChoice);
  const [open, setOpen] = useState(choice === null);
  if (!available) return null;

  function choose(value) {
    saveAnalyticsChoice(value);
    setChoice(value);
    setOpen(false);
  }

  return <>
    <button type="button" className="analytics-choice-trigger" onClick={() => setOpen(true)}>Privacy choices</button>
    {open && <div className="analytics-choice-overlay" role="presentation">
      <section className="analytics-choice-dialog" role="dialog" aria-modal="true" aria-labelledby="analytics-choice-title">
        <h2 id="analytics-choice-title">Choose whether to share usage data</h2>
        <p>With your permission, Google Analytics and Microsoft Clarity help us understand page visits and which parts of this site people use. We do not send story ideas, email addresses, or player details as analytics events.</p>
        <p>You can decline and still use this preview. Change your choice here at any time.</p>
        <div className="analytics-choice-actions">
          <button type="button" className="button-quiet" onClick={() => choose('denied')}>Decline analytics</button>
          <button type="button" className="button" onClick={() => choose('granted')}>Allow analytics</button>
        </div>
      </section>
    </div>}
  </>;
}
