import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareSampleDownload } from '../src/sampleDownload.mjs';

const pdf = '%PDF-1.7\nfixture PDF bytes\n%%EOF';
function zipEntries(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength), entries = [];
  let offset = 0;
  while (view.getUint32(offset, true) === 0x04034b50) {
    const size = view.getUint32(offset + 18, true), nameSize = view.getUint16(offset + 26, true), extra = view.getUint16(offset + 28, true);
    const start = offset + 30 + nameSize + extra;
    entries.push({ name: new TextDecoder().decode(bytes.subarray(offset + 30, offset + 30 + nameSize)), data: new TextDecoder().decode(bytes.subarray(start, start + size)) });
    offset = start + size;
  }
  assert.equal(view.getUint32(offset, true), 0x02014b50, 'central directory follows files');
  return entries;
}

test('each free edition and paper size delivers a complete pair with unchanged PDF bytes', async () => {
  for (const setting of ['home','classroom']) for (const paper of ['A4','Letter']) {
    const calls = [];
    const { blob, filename } = await prepareSampleDownload({setting,paper,role:'complete',fetcher:async(url,options)=>{
      calls.push(url);assert.equal(options.credentials,'same-origin');
      return new Response(pdf,{headers:{'content-type':'application/pdf'}});
    }});
    assert.equal(filename,`celebration-${setting}-complete-${paper}.zip`);
    assert.deepEqual(calls,[`/api/v1/samples/${setting}/${paper}/player`,`/api/v1/samples/${setting}/${paper}/guide`]);
    const files=zipEntries(new Uint8Array(await blob.arrayBuffer()));
    assert.deepEqual(files.map(x=>x.name),[`celebration-${setting}-player-${paper}.pdf`,`celebration-${setting}-guide-${paper}.pdf`]);
    assert.ok(files.every(x=>x.data===pdf));
  }
});

test('missing, mislabeled and invalid PDFs never produce a complete ZIP', async () => {
  for (const bad of [()=>new Response('Unavailable',{status:503}),()=>new Response('<html>Error</html>',{headers:{'content-type':'text/html'}}),()=>new Response('not a PDF',{headers:{'content-type':'application/pdf'}})]) {
    await assert.rejects(prepareSampleDownload({setting:'home',paper:'A4',role:'complete',fetcher:async url=>url.endsWith('/guide')?bad():new Response(pdf,{headers:{'content-type':'application/pdf'}})}),/unavailable|could not/);
  }
});

test('individual PDFs stay available and invalid selections make no request', async () => {
  const result=await prepareSampleDownload({setting:'classroom',paper:'Letter',role:'guide',fetcher:async()=>new Response(pdf,{headers:{'content-type':'application/pdf'}})});
  assert.equal(result.filename,'celebration-classroom-guide-Letter.pdf');
  assert.equal(await result.blob.text(),pdf);
  await assert.rejects(prepareSampleDownload({setting:'private',paper:'A4',role:'complete',fetcher:()=>{throw Error('Must not request');}}),/valid game/);
});

test('Chinese pairs use explicit language URLs, names and a matching release version',async()=>{
 for(const setting of ['home','classroom'])for(const paper of ['A4','Letter']){
  const calls=[];
  const {blob,filename}=await prepareSampleDownload({setting,paper,role:'complete',locale:'zh',fetcher:async url=>{
   calls.push(url);return new Response(pdf,{headers:{'content-type':'application/pdf','x-paper-adventure-locale':'zh','x-paper-adventure-pack-version':'1.0-zh.1'}});
  }});
  assert.equal(filename,`celebration-${setting}-complete-zh-${paper}.zip`);
  assert.deepEqual(calls,['player','guide'].map(role=>`/api/v1/samples/${setting}/${paper}/${role}?locale=zh`));
  const files=zipEntries(new Uint8Array(await blob.arrayBuffer()));
  assert.deepEqual(files.map(f=>f.name),['player','guide'].map(role=>`celebration-${setting}-${role}-zh-${paper}.pdf`));
  assert.ok(files.every(f=>f.data===pdf));
 }
});

test('Chinese download rejects English fallback, missing version and a release changing between files',async()=>{
 for(const mode of ['english','missing-version','changed','missing-guide'])await assert.rejects(prepareSampleDownload({setting:'home',paper:'A4',role:'complete',locale:'zh',fetcher:async url=>{
  if(mode==='missing-guide'&&url.includes('/guide'))return new Response('Unavailable',{status:404});
  const headers={'content-type':'application/pdf','x-paper-adventure-locale':mode==='english'?'en':'zh'};
  if(mode!=='missing-version')headers['x-paper-adventure-pack-version']=mode==='changed'&&url.includes('/guide')?'new':'old';
  return new Response(pdf,{headers});
 }}),/language|editions|unavailable/);
});

test('unsupported PDF locales are rejected before network access',async()=>{
 await assert.rejects(prepareSampleDownload({setting:'home',paper:'A4',role:'player',locale:'fr',fetcher:()=>{throw Error('Must not request');}}),/supported PDF language/);
});

test('a requested Chinese classroom revision rejects older and newer complete pairs',async()=>{
 for(const version of ['1.0-zh.1','1.0-zh.3'])await assert.rejects(prepareSampleDownload({setting:'classroom',paper:'A4',role:'complete',locale:'zh',expectedVersion:'1.0-zh.2',fetcher:async()=>new Response(pdf,{headers:{'content-type':'application/pdf','x-paper-adventure-locale':'zh','x-paper-adventure-pack-version':version}})}),/edition is being updated/);
 const result=await prepareSampleDownload({setting:'classroom',paper:'Letter',role:'complete',locale:'zh',expectedVersion:'1.0-zh.2',fetcher:async url=>{assert.match(url,/locale=zh&version=1\.0-zh\.2$/);return new Response(pdf,{headers:{'content-type':'application/pdf','x-paper-adventure-locale':'zh','x-paper-adventure-pack-version':'1.0-zh.2'}});}});
 assert.equal(zipEntries(new Uint8Array(await result.blob.arrayBuffer())).length,2);
});
