import { t as translateUi, localHref } from "./i18n/index.mjs";import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { analyticsAvailable, analyticsChoice, basicAnalyticsAllowed, saveAnalyticsPreferences, analyticsLocationAllowed } from './analytics.js';
import { useModalFocus } from './useModalFocus.js';

export function AnalyticsChoices() {
  const available = analyticsAvailable() && analyticsLocationAllowed();
  const [choice, setChoice] = useState(analyticsChoice);
  const [basic, setBasic] = useState(basicAnalyticsAllowed);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const dialogRef = useModalFocus(available && mounted && open, () => {
    setOpen(false);
  });
  // Static pages render only App. Keep the hydration pass identical, then
  // reveal the consent control after the client has mounted.
  if (!available || !mounted) return null;

  function choose(value, basicPreference = basic) {
    saveAnalyticsPreferences({ basic: basicPreference, enhanced: value });
    setBasic(basicPreference);
    setChoice(value);
    setOpen(false);
  }

  const footerSlot = document.getElementById('privacy-choices-slot');
  return <>
    {footerSlot && translateUi(createPortal(<button type="button" className="analytics-choice-trigger" aria-haspopup="dialog" onClick={() => {setBasic(basicAnalyticsAllowed());setOpen(true);}}>{translateUi("Privacy settings")}</button>, footerSlot))}
    {choice === null && !open && <aside className="analytics-consent-banner" aria-label={translateUi("Optional analytics")}>
      <p>{translateUi("With your permission, we use optional analytics cookies and session recordings to improve this website.")}</p>
      <div className="analytics-banner-actions">
        <button type="button" aria-label={translateUi("Allow optional analytics")} onClick={() => choose('granted', basicAnalyticsAllowed())}>{translateUi("Allow")}</button>
        <button type="button" aria-label={translateUi("Decline optional analytics")} onClick={() => choose('denied', basicAnalyticsAllowed())}>{translateUi("Decline")}</button>
        <a href={localHref("/en/privacy/")}>{translateUi("Privacy policy")}</a>
      </div>
    </aside>}
    {open && <div className="analytics-choice-overlay" role="presentation">
      <section ref={dialogRef} tabIndex={-1} className="analytics-choice-dialog" role="dialog" aria-modal="true" aria-labelledby="analytics-choice-title">
        <div className="analytics-choice-heading"><h2 id="analytics-choice-title">{translateUi("Your privacy choices")}</h2><button type="button" className="analytics-choice-close" aria-label={translateUi("Close privacy settings")} onClick={() => setOpen(false)}>×</button></div>
        <p>{translateUi("Ahrefs and Plausible count basic traffic without cookies. Google Analytics cookies and Clarity session recordings need your permission.")}</p>
        <p>{translateUi("Private pages are excluded. Change your choice anytime. ")}<a href={localHref("/en/cookies/")}>{translateUi("Privacy details")}</a>.</p>
        <label className="analytics-basic-choice"><input type="checkbox" aria-label={translateUi("Include basic traffic statistics (Ahrefs and Plausible)")} checked={basic} onChange={(event) => setBasic(event.target.checked)} />{translateUi(" Basic traffic statistics")}</label>
        <div className="analytics-choice-actions">
          <button type="button" className="button-quiet" aria-label={translateUi("Decline enhanced analytics")} onClick={() => choose('denied')}>{translateUi("Decline enhanced")}</button>
          <button type="button" className="button" aria-label={translateUi("Allow enhanced analytics")} onClick={() => choose('granted')}>{translateUi("Allow enhanced")}</button>
        </div>
      </section>
    </div>}
  </>;
}
