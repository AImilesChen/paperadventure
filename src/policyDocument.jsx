import { t as translateUi, localHref } from "./i18n/index.mjs";import { policyDocuments } from '../shared/legal-documents.mjs';
import { legalProfile } from '../shared/legal-profile.mjs';
import './livePages.css';
import './policyDocument.css';

export function PolicyDocument({ kind = 'privacy', Link = 'a', document: suppliedDocument }) {
  const document = suppliedDocument || policyDocuments[kind] || policyDocuments.privacy;
  const draft = document.publicationStatus === 'draft';
  const link = (path, label) => Link === 'a' ? <a key={path} href={localHref(path)}>{translateUi(label)}</a> : <Link key={path} to={localHref(path)}>{translateUi(label)}</Link>;
  return <main className="extended-page live-page">
    <section className="page-intro extended-intro">
      <span className="eyebrow">{draft ? translateUi('POLICY PREVIEW') : translateUi('POLICY')}</span>
      <h1>{translateUi(document.title)}</h1>
      <p>{translateUi("Version ")}{translateUi(document.version)}{document.effectiveAt ? translateUi(" \xB7 Effective {value0}", { value0: document.effectiveAt }) : translateUi(' · Prepared 24 October 2026')}</p>
    </section>
    <article className="live-shell privacy-document"><div className="live-panel">
      {draft && <div className="live-alert" role="note"><strong>{translateUi("Prepared for review before real payments open.")}</strong><p>{translateUi("The operator\u2019s public details and approval are still being confirmed. This preview does not enable real payments or change an existing order\u2019s terms.")}</p></div>}
      <nav aria-label={translateUi("Policy sections")}><ul>{document.sections.map((section, i) => <li key={section.heading}><a href={localHref(`#policy-section-${i + 1}`)}>{translateUi(section.heading)}</a></li>)}</ul></nav>
      {document.sections.map((section, i) => <section key={section.heading} id={`policy-section-${i + 1}`}><h2>{translateUi(section.heading)}</h2><p>{translateUi(section.body)}</p></section>)}
      <p><a href={localHref(`mailto:${legalProfile.supportEmail}`)}>{translateUi("Contact ")}{translateUi(legalProfile.brand)}{translateUi(" support")}</a></p>
      <nav aria-label={translateUi("Related policies")} className="live-actions">{translateUi(['terms', 'refunds', 'privacy', 'cookies'].filter((item) => item !== kind).map((item) => link(`/en/${item}/`, policyDocuments[item].title)))}</nav>
    </div></article>
  </main>;
}
