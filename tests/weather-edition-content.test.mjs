import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('Weather public detail pages use revised matching editions and neutral previews without exposing source IDs or actual readings',()=>{
 for(const locale of ['en','zh'])for(const route of ['themes/weather/','themes/weather/classroom/']){
  const html=read('dist/client/'+locale+'/'+route+'index.html');const main=html.match(/<main\b.*?<\/main>/s)?.[0];assert.ok(main);
  assert.match(main,/16/);assert.match(main,/19/);assert.match(main,/weather-(en|zh)-bulletin\.jpg/);
  for(const secret of ['4, 3, 1','W, W, N','9:00 / W','11:00 / 3','西、西、北','0、1、3'])assert.ok(!main.includes(secret),secret);
 }
 const zh=read('dist/client/zh/themes/weather/classroom/index.html');assert.ok(zh.includes('气象观测站')&&zh.includes('遗失的晨间气象简报'));
 const main=zh.match(/<main\b.*?<\/main>/s)[0];
 for(const mistranslation of ['原始论文观察结果','天文台游戏','美国信函'])assert.ok(!main.includes(mistranslation),mistranslation);
});
test('Weather safe preview bytes match their manifest and no paid PDF is placed in the public asset directory',()=>{
 const data=JSON.parse(read('content/weather-edition-previews.json'));
 for(const locale of ['en','zh'])for(const row of Object.values(data[locale])){const p=new URL('../'+row.path,import.meta.url);assert.equal(createHash('sha256').update(readFileSync(p)).digest('hex'),row.sha256);}
 for(const paper of ['A4','Letter'])for(const role of ['player','guide'])assert.equal(existsSync(new URL('../public/assets/weather-classroom-'+role+'-zh-'+paper+'.pdf',import.meta.url)),false);
});

