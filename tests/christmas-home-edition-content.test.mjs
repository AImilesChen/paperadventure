import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {homePrintPlan} from '../shared/home-game-planning.mjs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('Christmas bilingual detail pages match staged paper workshop files without publishing private clues or ending',()=>{
 for(const locale of ['en','zh'])for(const route of ['themes/christmas/','themes/christmas/home/']){
  const html=read(`dist/client/${locale}/${route}index.html`),main=html.match(/<main\b.*?<\/main>/s)?.[0]?.replace(/<!--.*?-->/g,'');assert.ok(main);
  assert.ok(main.includes(`christmas-home-${locale}-sign.jpg`));assert.ok(main.includes(`christmas-home-${locale}-gifts.jpg`));assert.match(main,/id="prepare-game"/);
  assert.ok(main.includes('16'));assert.ok(main.includes('15'));assert.ok(main.includes('12'));
  for(const secret of ['Gift A is for','Gift C has LOWER CENTRE','A / OWL','Dear gift crew','礼物A送给猫头鹰','礼物C的封口标记在下方中央','A／猫头鹰','亲爱的礼物小队'])assert.ok(!main.includes(secret),secret);
  if(locale==='zh'){
   for(const text of ['圣诞礼物配送站','16页玩家材料','15页成人主持指南','保持折叠','下方规则整块保留','2＋1','少剪','成人第14页'])assert.ok(main.includes(text),text);
   for(const wrong of ['主机指南','交流电','片材','14页玩家材料','8页成人主持指南'])assert.ok(!main.includes(wrong),wrong);
  }else{
   assert.ok(main.includes('16 Player pages'));assert.ok(main.includes('15-page Host Guide'));assert.ok(!main.includes('1 press'));
  }
 }
});
test('Christmas printing calculator counts both independent teams and only one printed adult guide',()=>{
 for(const [children,screen,printed,teams] of [[2,16,31,[2]],[6,16,31,[6]],[7,32,47,[4,3]],[12,32,47,[6,6]]]){
  assert.equal(homePrintPlan('christmas',children,false).totalSheets,screen);
  const p=homePrintPlan('christmas',children,true);assert.equal(p.totalSheets,printed);assert.deepEqual(p.teams,teams);assert.equal(p.guideSheets,15);assert.equal(p.pieces,teams.length*12);
 }
});
test('Christmas excerpts pin final language files and never publish paid full PDFs as public assets',()=>{
 const meta=JSON.parse(read('content/christmas-home-edition-previews.json'));
 for(const locale of ['en','zh']){
  assert.equal(Object.keys(meta[locale]).length,9);
  for(const a of Object.values(meta[locale])){
   assert.ok([3,5,7,10,12,13,15].includes(a.page));assert.equal(a.excerpt,true);assert.match(a.sourceSha256,/^[a-f0-9]{64}$/);
   assert.equal(createHash('sha256').update(readFileSync(new URL('../'+a.path,import.meta.url))).digest('hex'),a.sha256);
  }
  for(const paper of ['A4','Letter'])for(const role of ['player','guide'])assert.equal(existsSync(new URL(`../public/assets/christmas-home-${role}-${locale}-${paper}.pdf`,import.meta.url)),false);
 }
});
