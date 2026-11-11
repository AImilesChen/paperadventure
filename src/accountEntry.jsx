import {ArrowLeft,ArrowRight,Coins,GridNine,Receipt,UserCircle,WarningCircle} from '@phosphor-icons/react';
import {accountEntryContext} from '../shared/account-entry.mjs';

export default function AccountEntry({Link,googleRef,loading,busy,error,onRetry,returnTo,localPreview=false}){
 const context=accountEntryContext(returnTo);
 return <main className="extended-page live-page account-page">
  <section className="account-entry" aria-labelledby="account-title">
   <Link className="account-back" to={context.backPath}><ArrowLeft size={18} aria-hidden="true"/>{context.backLabel}</Link>
   <div className="live-panel account-card">
    <div className="account-heading"><span className="account-card-icon" aria-hidden="true"><UserCircle size={28} weight="duotone"/></span><span className="eyebrow">YOUR PAPER ADVENTURE ACCOUNT</span><h1 id="account-title">Sign in to Paper Adventure</h1><p className="account-summary">Keep your Sudoku progress, AI credits and adventures together.</p></div>
    {context.note&&<p className="account-return-note">{context.note}</p>}
    <div className="account-auth">{localPreview&&<p className="account-preview-note">Local layout preview · complete Google sign-in on the live website.</p>}<div className="account-google" ref={googleRef} aria-label="Sign in with Google" aria-busy={loading||busy}/>
     {loading&&<p className="account-status" role="status">Loading Google sign-in…</p>}
     {busy&&<p className="account-status" role="status">Signing you in…</p>}
     {error&&<div className="account-error"><p className="live-alert" role="alert"><WarningCircle size={19} aria-hidden="true"/>{error}</p><button type="button" className="button-quiet" disabled={busy} onClick={onRetry}>Try again</button></div>}
     <p className="account-adult-note">Use your adult Google account. No child account needed.</p>
    </div>
    <ul className="account-benefit-list">
     <li><span className="account-benefit-icon account-benefit-sudoku"><GridNine size={23} aria-hidden="true"/></span><span><strong>Sudoku progress</strong><small>Pick up your saved levels.</small></span></li>
     <li><span className="account-benefit-icon account-benefit-credits"><Coins size={23} aria-hidden="true"/></span><span><strong>Shared AI credits</strong><small>One balance across supported games.</small></span></li>
     <li><span className="account-benefit-icon account-benefit-orders"><Receipt size={23} aria-hidden="true"/></span><span><strong>Games &amp; orders</strong><small>Find your stories and downloads.</small></span></li>
    </ul>
    <p className="account-privacy">We use your verified Google email to find your account. We do not request access to your contacts or Google Drive. <Link to="/en/privacy/">Privacy Notice</Link>.</p>
   </div>
   <p className="account-support">Trouble signing in? <Link to="/en/help/">Contact support<ArrowRight size={16} aria-hidden="true"/></Link></p>
  </section>
 </main>;
}
