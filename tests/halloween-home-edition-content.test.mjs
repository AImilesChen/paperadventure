import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('Halloween Home bilingual public routes explain revised stages and mandatory private master without spoilers',()=>{
 for(const locale of ['en','zh'])for(const route of ['themes/halloween/','themes/halloween/home/']){
  const html=read(`dist/client/${locale}/${route}index.html`),main=html.match(/<main\b.*?<\/main>/s)?.[0];assert.ok(main);
  assert.match(main,new RegExp(`halloween-home-${locale}-facade\\.jpg`));assert.match(main,/id="prepare-game"/);
  for(const n of ['17','19','18','36','54','13'])assert.ok(main.includes(n),n);
  for(const secret of ['OWL WATCHES','BAT FLIES','PUMPKIN WELCOMES','STAR SHINES','WAIT FOR:','猫头鹰守望','蝙蝠飞翔','猫头鹰在南瓜的正上方','核准后才朗读'])assert.ok(!main.includes(secret),secret);
  if(locale==='zh'){
   for(const text of ['找回南瓜灯','皮普','移开整张翻窗纸','每组','第18页'])assert.ok(main.includes(text),text);
   for(const wrong of ['失踪的南瓜灯','15页玩家','10页主持','主机指南'])assert.ok(!main.includes(wrong),wrong);
  }
 }
});
test('Halloween previews pin final files and expose only bounded blank or method excerpts',()=>{
 const p=JSON.parse(read('content/halloween-home-edition-previews.json'));
 for(const locale of ['en','zh']){
  assert.equal(Object.keys(p[locale]).length,9);
  for(const a of Object.values(p[locale])){assert.ok([3,7,9,12,14].includes(a.page));assert.match(a.sourceSha256,/^[a-f0-9]{64}$/);assert.equal(createHash('sha256').update(readFileSync(new URL('../'+a.path,import.meta.url))).digest('hex'),a.sha256);}
  for(const paper of ['A4','Letter'])for(const role of ['player','guide'])assert.equal(existsSync(new URL(`../public/assets/halloween-home-${role}-${locale}-${paper}.pdf`,import.meta.url)),false);
 }
});
