import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import worker from '../backend/preview-deploy-worker.mjs';
import images from '../shared/search-images.json' with {type:'json'};
import {pageSearchImage} from '../shared/search-images.mjs';
import {publicPages,pageFor} from '../shared/page-manifest.mjs';
import {pageSchema} from '../shared/seo.mjs';

test('only approved public images lose noindex; preview, private and error responses keep protection',async()=>{
 const asset=(status,type)=>({ASSETS:{fetch:async()=>new Response('fixture',{status,headers:{'content-type':type,'x-robots-tag':'noindex'}})}});
 for(const path of Object.keys(images))for(const method of ['GET','HEAD']){
  const response=await worker.fetch(new Request('https://paperadventure.app'+path,{method}),asset(200,'image/png'));
  assert.equal(response.headers.get('x-robots-tag'),null,path);
 }
 for(const host of ['preview.paperadventure.app','paper-adventure-preview-v2.workers.dev']){
  assert.equal((await worker.fetch(new Request('https://'+host+'/og-image.jpg'),asset(200,'image/jpeg'))).headers.get('x-robots-tag'),'noindex');
 }
 for(const [path,status,type] of [
  ['/og-image.jpg',404,'image/jpeg'],['/og-image.jpg',500,'image/jpeg'],['/og-image.jpg',200,'text/html'],['/og-image.jpg',200,'application/pdf'],
  ['/assets/unreviewed.jpg',200,'image/jpeg'],['/internal/paid.pdf',200,'application/pdf'],['/en/account/',200,'text/html'],['/zh/checkout/',200,'text/html'],['/admin/',200,'text/html'],
 ])assert.equal((await worker.fetch(new Request('https://paperadventure.app'+path),asset(status,type))).headers.get('x-robots-tag'),'noindex',path);
});

test('page metadata and structured main images use real dimensions and match each language',async()=>{
 for(const p of publicPages){
  const image=pageSearchImage(p),html=await readFile('dist/client'+p.path+'index.html','utf8');
  assert.ok(html.includes(`<meta property="og:image" content="${image.url}"`),p.path);
  assert.ok(html.includes(`<meta name="twitter:image" content="${image.url}"`),p.path);
  assert.ok(html.includes(`<meta property="og:image:width" content="${image.width}"`),p.path);
  assert.ok(html.includes(`<meta property="og:image:height" content="${image.height}"`),p.path);
  assert.ok(html.includes(`<meta name="robots" content="${p.indexable?'max-image-preview:large':'noindex'}"`),p.path);
  const main=pageSchema(p,null)['@graph'][0];
  if(image.preferred)assert.deepEqual(main.primaryImageOfPage,{'@type':'ImageObject',url:image.url,width:image.width,height:image.height});
  else assert.equal(main.primaryImageOfPage,undefined);
 }
 for(const path of ['/en/','/en/for-home/','/en/for-classroom/','/en/occasions/halloween/','/en/themes/halloween/home/']){
  const en=pageSearchImage(pageFor(path)),zh=pageSearchImage(pageFor(path.replace('/en/','/zh/')));
  assert.equal(en.preferred,true,path);assert.deepEqual(en,zh);
 }
 assert.notEqual(pageSearchImage(pageFor('/en/for-home/')).url,pageSearchImage(pageFor('/en/occasions/halloween/')).url);
});

test('Halloween topics gain three same-language incoming routes and remain reachable from each homepage',async()=>{
 const rendered=new Map(await Promise.all(publicPages.filter(p=>p.indexable).map(async p=>[p.path,await readFile('dist/client'+p.path+'index.html','utf8')])));
 for(const lang of ['en','zh']){
  const target=`/${lang}/occasions/halloween/`;
  for(const source of [`/${lang}/for-home/`,`/${lang}/themes/halloween/home/`,`/${lang}/guides/run-a-printable-adventure/`]){
   assert.ok(rendered.get(source).includes(`href="${target}"`),source);
   if(lang==='zh')assert.ok(!rendered.get(source).includes('>Halloween activities and preparation tips<'),source);
  }
  const seen=new Set(),queue=[`/${lang}/`];
  while(queue.length){const route=queue.shift();if(seen.has(route))continue;seen.add(route);for(const [,href]of (rendered.get(route)||'').matchAll(/<a\b[^>]*href="([^"]+)"/g)){const path=new URL(href,'https://paperadventure.app'+route).pathname;if(rendered.has(path)&&!seen.has(path))queue.push(path);}}
  assert.ok(seen.has(target));
 }
});
