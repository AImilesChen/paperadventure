import { policyDocuments } from '../shared/legal-documents.mjs';
import { legalProfile } from '../shared/legal-profile.mjs';
import './livePages.css';
import './policyDocument.css';

export function PolicyDocument({ kind = 'privacy', Link = 'a', document: suppliedDocument }) {
  const document = suppliedDocument || policyDocuments[kind] || policyDocuments.privacy;
  const draft = document.publicationStatus === 'draft';
  const link = (path, label) => Link === 'a' ? <a key={path} href={path}>{label}</a> : <Link key={path} to={path}>{label}</Link>;
  return <main className="extended-page live-page">
    <section className="page-intro extended-intro">
      <span className="eyebrow">{draft ? 'POLICY PREVIEW' : 'POLICY'}</span>
      <h1>{document.title}</h1>
      <p>Version {document.version}{document.effectiveAt ? ` · Effective ${document.effectiveAt}` : ' · Prepared 24 October 2026'}</p>
    </section>
    <article className="live-shell privacy-document"><div className="live-panel">
      {draft && <div className="live-alert" role="note"><strong>Prepared for review before real payments open.</strong><p>The operator’s public details and approval are still being confirmed. This preview does not enable real payments or change an existing order’s terms.</p></div>}
      <nav aria-label="Policy sections"><ul>{document.sections.map((section, i) => <li key={section.heading}><a href={`#policy-section-${i + 1}`}>{section.heading}</a></li>)}</ul></nav>
      {document.sections.map((section, i) => <section key={section.heading} id={`policy-section-${i + 1}`}><h2>{section.heading}</h2><p>{section.body}</p></section>)}
      <p><a href={`mailto:${legalProfile.supportEmail}`}>Contact {legalProfile.brand} support</a></p>
      <nav aria-label="Related policies" className="live-actions">{['terms', 'refunds', 'privacy', 'cookies'].filter(item => item !== kind).map(item => link(`/en/${item}/`, policyDocuments[item].title))}</nav>
    </div></article>
  </main>;
}
