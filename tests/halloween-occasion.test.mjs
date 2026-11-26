import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import copy from '../src/halloweenOccasionCopy.json' with {type:'json'};
const html=lang=>readFile(`dist/client/${lang}/occasions/halloween/index.html`,'utf8');
test('both Halloween landing pages provide a complete activity plan without private solutions',async()=>{
 for(const lang of ['en','zh']){
  const s=await html(lang),main=s.match(/<main\b[\s\S]*?<\/main>/)[0],c=copy[lang];
  for(const text of [c.title,c.storyTitle,c.playTitle,c.groupTitle,c.prepareTitle,c.insideTitle,c.faqTitle,c.finishTitle])assert.ok(main.includes(text),text);
  assert.equal((main.match(/<h1\b/g)||[]).length,1);assert.equal((main.match(/<details>/g)||[]).length,6);
  assert.ok(main.includes(`href="/${lang}/themes/halloween/home/"`));assert.ok(main.includes('href="#prepare"'));assert.ok(main.includes('id="prepare"'));
  for(const name of ['facade','record','viewer'])assert.ok(main.includes(`/assets/halloween-home-${lang}-${name}.jpg`));
  assert.doesNotMatch(main,/halloween-home-(?:player|guide).*(?:\.pdf|\.zip)/);
  assert.match(main,/17/);assert.match(main,/19/);assert.ok(main.includes(c.steps[1]));
  if(lang==='zh')assert.doesNotMatch(main,/Plan your activity|Player Pack|Host Guide|Questions before you print/);
  const graph=JSON.parse(s.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])['@graph'];
  assert.deepEqual(graph.find(x=>x['@type']==='BreadcrumbList').itemListElement.map(x=>x.item),[`https://paperadventure.app/${lang}/`,`https://paperadventure.app/${lang}/for-home/`,`https://paperadventure.app/${lang}/occasions/halloween/`]);
  assert.deepEqual(graph.find(x=>x['@type']==='BreadcrumbList').itemListElement.map(x=>x.name),[c.home,c.family,c.topic]);
  assert.equal(graph[0].dateModified,'2026-11-26');assert.ok(graph[0].primaryImageOfPage);
  assert.ok(!graph.some(x=>['Product','Event','FAQPage'].includes(x['@type'])));
 }
});
test('Halloween is present in the existing desktop/mobile menu, with same-language targets',async()=>{
 for(const lang of ['en','zh']){
  const s=await html(lang),menu=s.match(/<div id="home-navigation"[\s\S]*?<\/section>\s*<\/div>/)?.[0]||s.slice(0,s.indexOf('<main'));
  for(const occasion of ['birthday','halloween','christmas'])assert.ok(menu.includes(`href="/${lang}/occasions/${occasion}/"`));
  assert.ok(menu.includes(lang==='zh'?'万圣节游戏':'Halloween games'));
  assert.ok(menu.indexOf(`/${lang}/occasions/birthday/`)<menu.indexOf(`/${lang}/occasions/halloween/`));
  assert.ok(menu.indexOf(`/${lang}/occasions/halloween/`)<menu.indexOf(`/${lang}/occasions/christmas/`));
 }
});
