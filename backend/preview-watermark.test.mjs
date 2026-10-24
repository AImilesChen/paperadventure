import test from 'node:test';
import assert from 'node:assert/strict';
import {buildBaselinePack} from './baseline-pack.mjs';
import {buildInteractiveGameView} from './pdf-interactive.mjs';
import {validatePurchase} from './domain.mjs';
import {planFixture} from '../tests/fixtures/creator-plan-fixture.mjs';
import {watermarkCandidatePdf} from './preview-watermark.mjs';

for(const setting of ['home','classroom'])for(const paper of ['A4','Letter'])test(`preview watermark preserves every original PDF command and cross-reference for ${setting}/${paper}`,async()=>{
 const spec=validatePurchase({sku:`custom_${setting}`,creatorVersion:3,customIdea:'clock tower',players:setting==='home'?4:24,groups:6,age:'8-10',paper,gameplay:{primary:'sequence',secondary:['code','reasoning']}}).spec;
 spec.plan=planFixture(spec);spec.planConfirmed=true;
 const {story}=await buildBaselinePack(spec),pair=buildInteractiveGameView(story,spec);
 for(const role of ['player','guide']){
  const input=pair[role],copy=input.slice(),marked=watermarkCandidatePdf(input),text=new TextDecoder().decode(marked),original=new TextDecoder().decode(input);
  assert.deepEqual(input,copy,'clean candidate bytes are immutable');
  const streams=[...original.matchAll(/stream\n([\s\S]*?)\nendstream/g)].map(x=>x[1]);
  assert.equal((text.match(/PREVIEW - not accepted/g)||[]).length,streams.length);
  for(const stream of streams)assert.ok(text.includes(stream),'every original drawing/text command remains intact');
  const xref=Number(text.match(/startxref\n(\d+)\n%%EOF$/)[1]);assert.equal(text.slice(xref,xref+4),'xref');
  const entries=text.slice(xref).split('\n').slice(3).filter(x=>/^\d{10} 00000 n /.test(x));
  entries.forEach((entry,i)=>assert.ok(text.slice(Number(entry.slice(0,10))).startsWith(`${i+1} 0 obj\n`)));
  assert.match(text,/48 12 Tm \(PREVIEW/,'mark stays below the 30-point existing footer');
 }
});
test('unknown, corrupted or compressed PDFs never return an unmarked candidate fallback',()=>{
 for(const source of ['%PDF-1.4\n%%EOF','%PDF-1.7\n%%EOF','not a PDF'])assert.throws(()=>watermarkCandidatePdf(new TextEncoder().encode(source)),/PREVIEW_FORMAT_UNSUPPORTED/);
});
