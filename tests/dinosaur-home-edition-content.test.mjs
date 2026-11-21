import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('Dinosaur detail pages describe revised Home files and never expose a completed map or supply selection',()=>{
 for(const locale of ['en','zh'])for(const route of ['themes/dinosaur/','themes/dinosaur/home/']){
  const main=read('dist/client/'+locale+'/'+route+'index.html').match(/<main\b.*?<\/main>/s)?.[0];assert.ok(main);
  assert.ok(!main.includes("Inside the Classroom adventure"));assert.match(main,/17/);assert.match(main,/18/);assert.match(main,new RegExp('dinosaur-home-'+locale+'-map\\.jpg'));
  for(const secret of ['SUN→FERN→FORD→TUNNEL','阳光地→蕨叶地→浅滩→隧道','1／阳、3／光、5／地','Pack BOOTS and LANTERN','A1 SUN, B1 FERN','欢迎回家！'])assert.ok(!main.includes(secret),secret);
  if(locale==='zh'){for(const wrong of ['纸张中继器','每名船员','15页玩家材料','Milo needs','主机指南','景观瓷砖','Inside the Classroom adventure'])assert.ok(!main.includes(wrong),wrong);assert.ok(main.includes('米洛')&&main.includes('小恐龙回家的路'));}
 }
});
test('Dinosaur public excerpts are final-source neutral or unfilled crops; complete paid PDFs stay private',()=>{
 const previews=JSON.parse(read('content/dinosaur-home-edition-previews.json'));
 for(const locale of ['en','zh'])for(const row of Object.values(previews[locale])){
  assert.ok([3,7,8,9,11,12,15,17].includes(row.page));assert.equal(createHash('sha256').update(readFileSync(new URL('../'+row.path,import.meta.url))).digest('hex'),row.sha256);assert.match(row.sourceSha256,/^[a-f0-9]{64}$/);
 }
 for(const locale of ['en','zh'])for(const paper of ['A4','Letter'])for(const role of ['player','guide'])assert.equal(existsSync(new URL(`../public/assets/dinosaur-home-${role}-${locale}-${paper}.pdf`,import.meta.url)),false);
});
