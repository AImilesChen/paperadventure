import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { createPolicyDocuments } from '../shared/legal-documents.mjs';
import { legalProfile, policyReleaseProblems } from '../shared/legal-profile.mjs';

const sql = value => `'${String(value).replaceAll("'", "''")}'`;
export function policyReleaseSql(profile, { publish = false } = {}) {
  const problems = policyReleaseProblems(profile);
  if (publish && problems.length) throw new Error('Policy publication requires confirmed operator details, an effective date and owner approval: ' + problems.join(', '));
  const documents = Object.values(createPolicyDocuments(profile));
  return '-- Prepared only: no database or payment configuration has been changed.\n' + documents.map(doc => {
    const sections = JSON.stringify(doc.sections);
    const version = `${doc.version}-${createHash('sha256').update(JSON.stringify([doc.title, doc.effectiveAt, sections])).digest('hex').slice(0, 12)}`;
    return `INSERT INTO legal_documents (kind,version,title,effective_at,sections_json,status) VALUES (${[doc.kind, version, doc.title, doc.effectiveAt || 'pending', sections, publish ? 'published' : 'draft'].map(sql).join(',')});`;
  }).join('\n') + '\n';
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const publish = process.argv.includes('--published');
  const output = resolve('output/legal');
  const statement = policyReleaseSql(legalProfile, { publish });
  await mkdir(output, { recursive: true });
  const docs = createPolicyDocuments();
  for (const doc of Object.values(docs)) await writeFile(resolve(output, `${doc.kind}.md`), `# ${doc.title}\n\nVersion ${doc.version} · ${doc.effectiveAt || 'Prepared for owner review; not published'}\n\n${doc.sections.map(section => `## ${section.heading}\n\n${section.body}`).join('\n\n')}\n`);
  await writeFile(resolve(output, publish ? 'publish-policies.sql' : 'draft-policies.sql'), statement);
  console.log(`Prepared four policy documents and ${publish ? 'review-approved' : 'draft-only'} SQL in output/legal. No database connection or release flag was changed.`);
}
