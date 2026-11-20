import { t as translateUi, localHref } from "./i18n/index.mjs";import { ArrowLeft, ArrowRight, Coins, GridNine, Receipt, UserCircle, WarningCircle } from '@phosphor-icons/react';
import { accountEntryContext } from '../shared/account-entry.mjs';

export default function AccountEntry({ Link, googleRef, loading, busy, error, onRetry, returnTo, localPreview = false }) {
  const context = accountEntryContext(returnTo);
  return <main className="extended-page live-page account-page">
  <section className="account-entry" aria-labelledby="account-title">
   <Link className="account-back" to={localHref(context.backPath)}><ArrowLeft size={18} aria-hidden="true" />{translateUi(context.backLabel)}</Link>
   <div className="live-panel account-card">
    <div className="account-heading"><span className="account-card-icon" aria-hidden="true"><UserCircle size={28} weight="duotone" /></span><span className="eyebrow">{translateUi("YOUR PAPER ADVENTURE ACCOUNT")}</span><h1 id="account-title">{translateUi("Sign in to Paper Adventure")}</h1><p className="account-summary">{translateUi("Keep your Sudoku progress, AI credits and adventures together.")}</p></div>
    {context.note && <p className="account-return-note">{translateUi(context.note)}</p>}
    <div className="account-auth">{localPreview && <p className="account-preview-note">{translateUi("Local layout preview \xB7 complete Google sign-in on the live website.")}</p>}<div className="account-google" ref={googleRef} aria-label={translateUi("Sign in with Google")} aria-busy={loading || busy} />
     {loading && <p className="account-status" role="status">{translateUi("Loading Google sign-in\u2026")}</p>}
     {busy && <p className="account-status" role="status">{translateUi("Signing you in\u2026")}</p>}
     {error && <div className="account-error"><p className="live-alert" role="alert"><WarningCircle size={19} aria-hidden="true" />{translateUi(error)}</p><button type="button" className="button-quiet" disabled={busy} onClick={onRetry}>{translateUi("Try again")}</button></div>}
     <p className="account-adult-note">{translateUi("Use your adult Google account. No child account needed.")}</p>
    </div>
    <ul className="account-benefit-list">
     <li><span className="account-benefit-icon account-benefit-sudoku"><GridNine size={23} aria-hidden="true" /></span><span><strong>{translateUi("Sudoku progress")}</strong><small>{translateUi("Pick up your saved levels.")}</small></span></li>
     <li><span className="account-benefit-icon account-benefit-credits"><Coins size={23} aria-hidden="true" /></span><span><strong>{translateUi("Shared AI credits")}</strong><small>{translateUi("One balance across supported games.")}</small></span></li>
     <li><span className="account-benefit-icon account-benefit-orders"><Receipt size={23} aria-hidden="true" /></span><span><strong>{translateUi("Games & orders")}</strong><small>{translateUi("Find your stories and downloads.")}</small></span></li>
    </ul>
    <p className="account-privacy">{translateUi("We use your verified Google email to find your account. We do not request access to your contacts or Google Drive. ")}<Link to={localHref("/en/privacy/")}>{translateUi("Privacy Notice")}</Link>.</p>
   </div>
   <p className="account-support">{translateUi("Trouble signing in? ")}<Link to={localHref("/en/help/")}>{translateUi("Contact support")}<ArrowRight size={16} aria-hidden="true" /></Link></p>
  </section>
 </main>;
}
