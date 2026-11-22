import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('Forest EN/ZH routes show revised neutral sources and complete preparation facts',()=>{
 for(const locale of ['en','zh'])for(const route of ['themes/forest/','themes/forest/home/']){
  const html=read(`dist/client/${locale}/${route}index.html`),main=html.match(/<main\b.*?<\/main>/s)?.[0];assert.ok(main);
  assert.match(main,new RegExp(`forest-home-${locale}-mailbag\\.jpg`));assert.match(main,/id="prepare-game"/);
  for(const n of ['18','17','19','15','35','53'])assert.ok(main.includes(n),n);
  for(const secret of ['BLUE TREE','ACORN','Nori reaches Owl House','蓝树院落4号','诺莉来到蓝树','封口标记：橡果','猫头鹰家等P17'])assert.ok(!main.includes(secret),secret);
  if(locale==='zh'){
   assert.ok(main.includes('森林邮局投递谜案')&&main.includes('诺莉'));
   for(const wrong of ['主机指南','16页玩家','10页主持','邮件批次','造纸'])assert.ok(!main.includes(wrong),wrong);
  }
 }
});
test('Forest bilingual previews match final source hashes and paid PDFs remain private',()=>{
 const previews=JSON.parse(read('content/forest-home-edition-previews.json'));
 for(const locale of ['en','zh']){
  assert.equal(Object.keys(previews[locale]).length,15);
  for(const p of Object.values(previews[locale])){
   assert.ok([3,6,7,10,12,14,15,17].includes(p.page));assert.match(p.sourceSha256,/^[a-f0-9]{64}$/);
   assert.equal(createHash('sha256').update(readFileSync(new URL('../'+p.path,import.meta.url))).digest('hex'),p.sha256);
  }
  for(const paper of ['A4','Letter'])for(const role of ['player','guide'])assert.equal(existsSync(new URL(`../public/assets/forest-home-${role}-${locale}-${paper}.pdf`,import.meta.url)),false);
 }
});
