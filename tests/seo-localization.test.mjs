import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {englishPages,publicPages,pageFor} from '../shared/page-manifest.mjs';
import {localizedPageMetadata,seoMessageKey} from '../shared/seo-localization.mjs';
import {dictionaries,translate} from '../shared/locale-text.mjs';
import {pageSchema} from '../shared/seo.mjs';
import {canonicalRedirect} from '../shared/canonical-route.mjs';
import {renderLlms} from '../shared/llms.mjs';
import {editorialFor} from '../shared/editorial.mjs';
import site from '../backend/preview-deploy-worker.mjs';
import packagedSite from '../worker/index.js';

test('all public Chinese pages have reviewed metadata independent of English wording',()=>{
 const en=publicPages.filter(p=>p.locale==='en'&&p.indexable),zh=publicPages.filter(p=>p.locale==='zh'&&p.indexable);
 assert.equal(en.length,54);assert.equal(zh.length,54);
 for(const p of en){const original=englishPages.find(e=>e.path===p.path);assert.equal(p.title,original.title);assert.equal(p.description,original.description);}
 for(const p of zh){assert.equal(p.seoTranslationComplete,true,p.path);assert.match(p.title,/[\u4e00-\u9fff]/);assert.match(p.description,/[\u4e00-\u9fff]/);}
 const original=englishPages.find(p=>p.path==='/en/themes/forest/home/');
 const changed=localizedPageMetadata({...original,title:'A revised English title',description:'New source wording that has never been translated.'},'zh');
 assert.equal(changed.description,pageFor('/zh/themes/forest/home/').description);assert.equal(changed.seoTranslationComplete,true);
 const key=seoMessageKey(original.path,'description'),saved=dictionaries.zh[key];
 try{delete dictionaries.zh[key];assert.equal(localizedPageMetadata(original,'zh').seoTranslationComplete,false);}finally{dictionaries.zh[key]=saved;}
});

test('Chinese products use reviewed names without modifying prices, SKU or actual PDF language',async()=>{
 let count=0;
 for(const p of publicPages.filter(p=>p.indexable&&p.locale==='zh')){
  const markup=await readFile('dist/client'+p.path+'index.html','utf8');
  const graph=JSON.parse(markup.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])['@graph'];
  const product=graph.find(e=>e['@type']==='Product');if(!product)continue;count++;
  const englishMarkup=await readFile('dist/client'+p.path.replace('/zh/','/en/')+'index.html','utf8');
  const english=JSON.parse(englishMarkup.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])['@graph'].find(e=>e['@type']==='Product');
  assert.match(product.name,/[\u4e00-\u9fff]/);assert.match(product.description,/[\u4e00-\u9fff]/);assert.equal(product.sku,english.sku);
  for(const k of ['price','priceCurrency','availability'])assert.equal(product.offers?.[k],english.offers?.[k],p.path);
  assert.ok(markup.includes(product.name.split(' · ')[0]),p.path);
 }
 assert.equal(count,12);
 const lighthouse=pageSchema(pageFor('/zh/escape-room-games/the-sleeping-lighthouse/'),null)['@graph'][0];
 assert.equal(lighthouse.inLanguage,'zh-Hans');assert.equal(lighthouse.about.inLanguage,'en');
});

test('production protocol and aliases converge in one permanent redirect with query preserved',async()=>{
 const cases=[
  ['http://paperadventure.app/?ref=directory','https://paperadventure.app/en/?ref=directory'],
  ['http://paperadventure.app/en','https://paperadventure.app/en/'],
  ['http://paperadventure.app/zh/pricing?theme=forest','https://paperadventure.app/zh/pricing/?theme=forest'],
  ['http://paperadventure.app/zh/sudoku/points/?pack=ai_credits_100&returnTo=%2Fzh%2Fsudoku%2F','https://paperadventure.app/zh/credits/?pack=ai_credits_100&returnTo=%2Fzh%2Fsudoku%2F'],
  ['https://paperadventure.app/en/sudoku/weekly/old/?week=private','https://paperadventure.app/en/sudoku/']
 ];
 for(const runtime of [site,packagedSite])for(const [from,to]of cases){
  const response=await runtime.fetch(new Request(from),{});assert.equal(response.status,308);assert.equal(response.headers.get('location'),to);assert.equal(canonicalRedirect(new Request(to)),null);
 }
 for(const u of ['https://paperadventure.app/zh/','http://127.0.0.1:5856/zh/','http://preview.paperadventure.app/en/','http://paperadventure.app/api/v1/health'])assert.equal(canonicalRedirect(new Request(u)),null,u);
 assert.equal(canonicalRedirect(new Request('http://paperadventure.app/zh/checkout/',{method:'POST',body:'test'})),null);
 let forwarded;const incoming=new Request('http://paperadventure.app/api/v1/auth/callback?fixture=1');
 await site.fetch(incoming,{BACKEND_STAGE:{fetch:async r=>{forwarded=r;return Response.json({fixture:true});}}});assert.equal(forwarded,incoming);
});

test('rendered Chinese SEO tags agree and retain index/alternate policies',async()=>{
 const unique=new Set();
 for(const p of publicPages.filter(p=>p.locale==='zh'&&p.indexable)){
  const html=await readFile('dist/client'+p.path+'index.html','utf8');assert.ok(html.includes('content="'+p.description.replaceAll('&','&amp;').replaceAll('"','&quot;')+'"'),p.path);
  assert.ok(!unique.has(p.description),p.path);unique.add(p.description);assert.match(html,/hreflang="zh-Hans"/);assert.doesNotMatch(html,/<meta name="robots" content="noindex"/);
 }
 for(const route of ['/zh/account/','/en/checkout/'])assert.match(await readFile('dist/client'+route+'index.html','utf8'),/<meta name="robots" content="noindex"/);
});

test('Chinese explanations retain numeric deductions and reviewed terminology',async()=>{
 for(const slug of ['single-candidate','hidden-single','locked-candidates','naked-pair']){
  const html=await readFile('dist/client/zh/sudoku/techniques/'+slug+'/index.html','utf8');
  assert.doesNotMatch(html,/裸体单打|全膳|货币对|教学岗位|可以裸穿|行孤叶|候选.*头寸/);
  assert.doesNotMatch(html,/>single candidate<|>hidden single<|>column<|>row<|>box</);
 }
 assert.equal(translate('HoDoKu: naked singles and full houses','zh'),'HoDoKu：显性唯一数与单格补全');
 assert.match(translate('Use the four printed job cards. Jobs rotate after checkpoints 1–4 so the same child does not always read or write.','zh'),/岗位/);
 const html=await readFile('dist/client/zh/guides/organize-a-classroom-adventure/index.html','utf8');
 assert.match(html,/12页/);assert.match(html,/18页/);assert.match(html,/72张/);assert.match(html,/classroom-plan\.jpg/);
 assert.equal(editorialFor('/en/sudoku/techniques/single-candidate/','en').modified,'2026-11-13');
 assert.equal(editorialFor('/en/sudoku/techniques/single-candidate/','zh').modified,'2026-11-22');
});

test('public guide describes supported languages and keeps deferred AI scope accurate',()=>{
 const text=renderLlms();assert.match(text,/Simplified Chinese/);assert.match(text,/\/zh\/samples\/classroom\//);assert.match(text,/AI-generated custom stories and PDFs currently use English/);
});
