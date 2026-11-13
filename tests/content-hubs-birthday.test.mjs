import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {guides} from '../shared/guides.mjs';
import {lessons,lessonPath} from '../shared/sudoku/learning.mjs';
const html=p=>readFile('dist/client'+p+'index.html','utf8');

test('birthday guide counts one adult guide and one finale, and supports practical team handoffs',async()=>{
 const body=await html(guides[2].path);
 for(const text of ['11 sheets','21 sheets','22 sheets','32 sheets','For eight guests','two teams of four','Teams can advance separately.','One team finishes before the other','A child needs help reading','The party needs a break'])assert.ok(body.includes(text),text);
 for(const id of ['party-decisions','party-finish']){assert.ok(body.includes('id="'+id+'"'));assert.ok(body.includes('href="#'+id+'"'));}
 assert.ok(body.includes('"datePublished":"2026-10-28"'));assert.ok(body.includes('"dateModified":"2026-11-13"'));assert.match(body,/<time\s+datetime="2026-11-13"/i);
 assert.ok(body.includes('href="/en/samples/home/"'));assert.ok(body.includes('href="/en/guides/run-a-printable-adventure/#jobs"'));
 assert.match(body,/<details class="gp-theme-options">/);assert.ok(!body.includes('tested with eight guests'));
});
test('guide centre offers three distinct guide choices before optional detailed comparison',async()=>{
 const body=await html('/en/guides/');
 assert.equal((body.match(/class="gp-choice gp-/g)||[]).length,3);
 assert.ok(body.indexOf('class="gp-choices"')<body.indexOf('class="gp-compare"'));
 assert.match(body,/<details class="gp-compare"><summary>Compare team sizes/);
 assert.ok(!body.includes('class="guide-cards"'));
 const links=[...body.matchAll(/href="([^"#]+)#[^"]+"/g)].map(m=>m[1]);for(const guide of guides)assert.ok(links.includes(guide.path));
});
test('technique centre groups actual examples by placements versus eliminations before the full board',async()=>{
 const body=(await html('/en/sudoku/techniques/')).replace(/<!--[\s\S]*?-->/g,'');
 assert.ok(body.indexOf('id="technique-directory"')<body.indexOf('id="read-candidates"'));
 assert.match(body,/id="tt-placement-title">Find a digit to place/);assert.match(body,/id="tt-elimination-title">Rule out candidate notes/);
 for(const l of lessons){const start=body.indexOf('id="technique-'+l.id+'"'),end=body.indexOf('Read the '+l.title.toLowerCase()+' tutorial',start),card=body.slice(start,end+100);assert.ok(start>=0&&end>start);assert.ok(card.includes('href="'+lessonPath(l)+'"'));assert.ok(card.includes(l.when));assert.ok(card.includes(l.id==='locked'?'tt-mini-box':'tt-zoom-cell'));}
 const graph=JSON.parse(body.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/)[1])['@graph'];assert.ok(graph.some(x=>x['@type']==='CollectionPage'));assert.ok(!graph.some(x=>x['@type']==='Article'));
});
test('all three revised pages expose real anchor targets, with no navigation back to unrelated sections',async()=>{
 for(const path of ['/en/guides/',guides[2].path,'/en/sudoku/techniques/']){
  const body=await html(path);
  for(const [,href]of body.matchAll(/href="([^"]+)"/g)){const url=new URL(href.replaceAll('&amp;','&'),'https://paperadventure.app'+path);if(url.origin!=='https://paperadventure.app'||!url.hash)continue;const target=url.pathname===path?body:await html(url.pathname);assert.ok(target.includes('id="'+url.hash.slice(1)+'"'),path+' → '+href);}
 }
});
