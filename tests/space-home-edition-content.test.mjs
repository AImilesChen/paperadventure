import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('Space Home EN/ZH detail pages use final revised counts and localized neutral previews',()=>{
 for(const locale of ['en','zh'])for(const route of ['themes/space/','themes/space/home/']){
  const html=read(`dist/client/${locale}/${route}index.html`),main=html.match(/<main\b.*?<\/main>/s)?.[0];assert.ok(main);
  assert.match(main,/19/);assert.match(main,/18/);assert.match(main,/24/);assert.match(main,/20/);
  assert.match(main,new RegExp(`space-home-${locale}-power-board\\.jpg`));assert.match(main,/id="prepare-game"/);
  for(const secret of ['R-T-K','SEND3','发3次信号','三次短信号通过中频段','MID / 3 / TRIANGLE','中频段／3／三角形'])assert.ok(!main.includes(secret),secret);
  if(locale==='zh'){
   assert.ok(main.includes('找回太空信号')&&main.includes('皮普'));
   for(const wrong of ['主机指南','丢失的太空信号','14页玩家','10页主持','船员'])assert.ok(!main.includes(wrong),wrong);
  }
 }
});
test('public Space excerpts match final private source hashes and never publish paid PDFs',()=>{
 const previews=JSON.parse(read('content/space-home-edition-previews.json'));
 for(const locale of ['en','zh']){
  assert.equal(Object.keys(previews[locale]).length,12);
  for(const item of Object.values(previews[locale])){
   assert.ok([3,4,5,8,9,14,17].includes(item.page));assert.match(item.sourceSha256,/^[a-f0-9]{64}$/);
   assert.equal(createHash('sha256').update(readFileSync(new URL('../'+item.path,import.meta.url))).digest('hex'),item.sha256);
  }
  for(const paper of ['A4','Letter'])for(const role of ['player','guide'])assert.equal(existsSync(new URL(`../public/assets/space-home-${role}-${locale}-${paper}.pdf`,import.meta.url)),false);
 }
});
