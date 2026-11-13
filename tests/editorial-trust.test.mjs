import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {publicPages,pageFor} from '../shared/page-manifest.mjs';
import {pageSchema} from '../shared/seo.mjs';
import {editorialFor,publisherDetails} from '../shared/editorial.mjs';

const html=path=>readFile(new URL('../dist/client'+path+'index.html',import.meta.url),'utf8');
test('publisher/contact pages are public, linked and typed without invented external identities',async()=>{
 for(const [path,type] of [['/en/about/','AboutPage'],['/en/contact/','ContactPage']]){
  const page=pageFor(path);assert.equal(page.indexable,true);
  const schema=pageSchema(page,null)['@graph'];assert.equal(schema[0]['@type'],type);
  const org=schema.find(e=>e['@type']==='Organization');assert.equal(org.email,publisherDetails.email);assert.equal(org.contactPoint.url,'https://paperadventure.app/en/contact/');assert.equal(org.sameAs,undefined);
  const body=await html(path);assert.match(body,/<h1>/);assert.ok(body.includes('support@paperadventure.app')||body.includes('Who runs Paper Adventure'));
 }
 const home=await html('/en/');for(const path of ['/en/about/','/en/contact/'])assert.ok(home.includes('href="'+path+'"'));
});
test('every dated article exposes the same fixed dates to readers and search engines',async()=>{
 for(const page of publicPages){
  const dates=editorialFor(page.path);if(!dates)continue;
  const article=pageSchema(page,null)['@graph'].find(e=>e['@type']==='Article');assert.ok(article,page.path);
  const body=await html(page.path);
  for(const [field,value] of [['datePublished',dates.published],['dateModified',dates.modified]].filter(([,v])=>v)){assert.equal(article[field],value);assert.ok(body.includes('dateTime="'+value+'"')||body.includes('datetime="'+value+'"'),page.path+': '+field);}
  assert.equal(article.author.url,'https://paperadventure.app/en/about/#how-we-make-it');assert.ok(body.includes('href="/en/about/#how-we-make-it"'));
 }
 assert.equal(editorialFor('/en/guides/printable-birthday-party-adventures/').modified,'2026-11-13');
 assert.equal(editorialFor('/en/sudoku/techniques/naked-pair/').modified,'2026-11-13');
});
test('selected samples include usable decisions, exact argument and visible source links',async()=>{
 for(const path of ['/en/guides/run-a-printable-adventure/','/en/guides/organize-a-classroom-adventure/']){const body=await html(path);assert.ok(body.includes('id="hosting-decisions"'));assert.ok(body.includes('href="#hosting-decisions"'));assert.match(body,/Materials behind this guide/);}
 const hidden=await html('/en/sudoku/techniques/hidden-single/');assert.ok(hidden.includes('R8C3'));assert.match(hidden,/exactly one legal position/);assert.ok(hidden.includes('https://www.nikoli.co.jp/en/puzzles/sudoku/'));assert.ok(hidden.includes('https://hodoku.sourceforge.net/en/tech_singles.php'));
});
