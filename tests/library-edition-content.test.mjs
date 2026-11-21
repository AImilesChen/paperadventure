import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';import {independentClassroomWorlds} from '../shared/classroom-worlds.mjs';
test('Library public pages describe revised languages without revealing the target title, first result or witness plan',()=>{
 for(const locale of ['en','zh'])for(const path of [`${locale}/themes/library/index.html`,`${locale}/themes/library/classroom/index.html`]){
  const html=readFileSync('dist/client/'+path,'utf8').match(/<main\b[\s\S]*?<\/main>/)?.[0];assert.ok(html,path);
  assert.doesNotMatch(html,/The Lantern Path|灯笼小路|L-24|B-D-C-A|paper route copy|Kit kept the library/);
  assert.match(html,/14/);assert.match(html,/19/);
 }
 const world=independentClassroomWorlds.find(w=>w.id==='library');assert.doesNotMatch(JSON.stringify(world.story.classroom),/paper route copy|The Lantern Path/);
});
test('Library preview references all exist and retain safe legacy aliases without publishing the paid PDF files',()=>{
 const m=JSON.parse(readFileSync('content/library-edition-previews.json'));assert.equal(m.items.length,10);
 for(const p of m.items){assert.ok(existsSync(p.path));assert.equal(createHash('sha256').update(readFileSync(p.path)).digest('hex'),p.sha256);assert.ok([3,4,6,9,12].includes(p.page));}
 for(const [old,key] of Object.entries({shelf:'shelf',order:'order',crew:'progress',opening:'progress',route:'progress',writing:'writing',reading:'progress',review:'writing'}))assert.deepEqual(readFileSync(`public/assets/library-classroom-preview-${old}.jpg`),readFileSync(`public/assets/library-en-${key}.jpg`));
 for(const name of ['player','guide'])assert.equal(existsSync(`public/library-classroom-${name}-en-A4.pdf`),false);
});
