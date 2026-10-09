import './livePages.css';

export default function CurrentPrivacyNotice() {
  return <main className="extended-page live-page">
    <section className="page-intro extended-intro">
      <span className="eyebrow">PRIVACY NOTICE</span>
      <h1>How Paper Adventure uses your information.</h1>
      <p>Effective 9 October 2026 · Version 1.0 · Applies to the website, free trial downloads and adult Google sign-in currently available.</p>
    </section>
    <article className="live-shell privacy-document">
      <div className="live-panel">
        <h2>Who runs this site</h2>
        <p>Paper Adventure is operated by an individual based in Hong Kong under the Paper Adventure name. For privacy questions or requests, email <a href="mailto:support@paperadventure.app">support@paperadventure.app</a>.</p>
        <h2>Information we handle</h2>
        <ul>
          <li>When you browse or download a free PDF, Cloudflare processes technical request information, such as IP address, browser details and requested pages, to deliver and protect the site.</li>
          <li>If you choose Google sign-in, Google provides an ID token containing your verified adult email and Google account identifier. Our server verifies the token and uses a keyed hash of your email to identify your account. We do not store the Google ID token or your plain email in the account database. Google may process information when its sign-in button loads or you use it.</li>
          <li>If you save an adventure idea in this browser, its settings are stored on your device until you delete them or clear browser storage. Do not enter a child's name, photo, address or other identifying details.</li>
          <li>If you contact support, we receive your email address and message through our support mail service.</li>
        </ul>
        <h2>Why we use it</h2>
        <p>We use account information to provide the adult sign-in and adventure shelf you request. We use technical request data to operate and secure the site, and support messages to answer you. These activities rely on providing the requested service and our legitimate interest in maintaining a secure, working service. We do not currently run non-essential analytics, collect payments or offer public AI story generation.</p>
        <h2>Cookies and storage</h2>
        <p>The essential <code>paw_google_nonce</code> cookie protects one sign-in attempt and expires after five minutes. After sign-in, the essential, HttpOnly <code>paw_session</code> cookie lasts up to seven days; signing out clears it. A saved planning draft uses your browser's local storage only when you choose to save it. Free PDF downloads require no account.</p>
        <h2>Who receives information and where</h2>
        <p>Cloudflare hosts the site and private account infrastructure. Google provides sign-in. Our support mail service handles messages you send. These providers and the Hong Kong operator may process information outside your country. See <a href="https://policies.google.com/privacy">Google's privacy policy</a> and <a href="https://www.cloudflare.com/privacypolicy/">Cloudflare's privacy policy</a> for their practices; contact us for information about our current arrangements.</p>
        <h2>How long information is kept</h2>
        <p>Sign-in tokens are checked during login and are not saved as account records. The sign-in nonce expires after five minutes and the session after seven days. A local planning draft remains until you delete it or clear browser storage. Support messages are kept while we handle the request and for any period needed to resolve a related dispute or meet an applicable legal duty. Technical request data follows the hosting provider's configured security and operational retention.</p>
        <h2>Your choices and requests</h2>
        <p>You can browse and download the free trial without signing in. You can sign out to end your session, delete a local draft in your browser, and ask us to access, correct or delete information associated with you by emailing <a href="mailto:support@paperadventure.app?subject=Privacy%20request">support@paperadventure.app</a>. We may need to verify your request and may retain information where law requires it. You can also contact your local data-protection authority where applicable.</p>
        <h2>Children and changes</h2>
        <p>Online accounts are for adults organising printable activities; we do not create child accounts. Please do not send us children's identifying information. We will update this notice before enabling payments, public AI generation or optional analytics, and show a new effective date when it changes.</p>
      </div>
    </article>
  </main>;
}
