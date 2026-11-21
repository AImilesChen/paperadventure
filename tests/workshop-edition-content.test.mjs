import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('Workshop details describe paired revised editions with neutral tools and no design or verdict solution',()=>{
 for(const locale of ['en','zh'])for(const route of ['themes/workshop/','themes/workshop/classroom/']){
  const main=read('dist/client/'+locale+'/'+route+'index.html').match(/<main\b.*?<\/main>/s)?.[0];assert.ok(main);
  assert.match(main,/16/);assert.match(main,/19/);assert.match(main,/workshop-(en|zh)-pieces\.jpg/);
  for(const secret of ['R, M, Q','R、M、Q','TWO STARS','two stars','两颗星','A is 56','A太宽','X-Y-Z'])assert.ok(!main.includes(secret),secret);
  if(locale==='zh'){assert.ok(main.includes('小发明家纸艺工坊')&&main.includes('蓝图接力：纸槽传信'));for(const wrong of ['纸张中继器','美国信函','12页玩家材料'])assert.ok(!main.includes(wrong),wrong);}
 }
});
test('Workshop neutral previews match actual revised PDF manifests and paid files are not public assets',()=>{
 const data=JSON.parse(read('content/workshop-edition-previews.json'));
 for(const locale of ['en','zh'])for(const row of Object.values(data[locale])){
  assert.equal(createHash('sha256').update(readFileSync(new URL('../'+row.path,import.meta.url))).digest('hex'),row.sha256);
  assert.ok(row.sourceSha256&&[8,14].includes(row.page));
 }
 for(const locale of ['en','zh'])for(const paper of ['A4','Letter'])for(const role of ['player','guide'])assert.equal(existsSync(new URL(`../public/assets/workshop-classroom-${role}-${locale}-${paper}.pdf`,import.meta.url)),false);
});
