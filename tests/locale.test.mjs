import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {localePath,basePath,switchLanguage,routeLocale} from '../shared/locale.mjs';
import {translate,dictionaries} from '../shared/locale-text.mjs';
import {publicPages} from '../shared/page-manifest.mjs';
import {accountReturnPath} from '../shared/account-return.mjs';
import {safeGameReturn} from '../shared/credits/products.mjs';
import {isAnalyticsPage} from '../src/analytics-route.mjs';
import {checkoutForm} from '../backend/payments.mjs';
import worker from '../backend/preview-deploy-worker.mjs';
import {localHref} from '../src/i18n/index.mjs';
import {sudokuHelpCopy} from '../shared/sudoku/help-copy.mjs';
import vm from 'node:vm';

test('language switches preserve page, checkout selections, game position and safe return URLs',()=>{
 assert.equal(localePath('/en/create/?setting=classroom&theme=space#creator-form','zh'),'/zh/create/?setting=classroom&theme=space#creator-form');
 const switched=new URL(switchLanguage('/en/account/','?returnTo=%2Fen%2Fsudoku%2Fplay%2F%3Flevel%3D7','#sign-in','zh'),'https://test.invalid');
 assert.equal(switched.pathname,'/zh/account/');assert.equal(switched.searchParams.get('returnTo'),'/zh/sudoku/play/?level=7');assert.equal(switched.hash,'#sign-in');
 for(const value of ['/api/v1/orders','/admin/','https://other.example/en/','//other.example/en/','/en\\evil'])assert.equal(localePath(value,'zh'),value);
 assert.equal(basePath('/zh/account/billing/'),'/en/account/billing/');assert.equal(routeLocale('/zh-hack/'),'en');
 assert.equal(accountReturnPath('/zh/orders/fixture/?tab=files'),'/zh/orders/fixture/?tab=files');
 for(const bad of ['//attacker.test/zh/','https://attacker.test/zh/','/zh/../../admin/'])assert.equal(accountReturnPath(bad),'/en/account/overview/');
 assert.equal(safeGameReturn('/zh/sudoku/play/?level=7&token=private'),'/zh/sudoku/play/?level=7');
 assert.equal(safeGameReturn('/zh/escape-room-puzzles/#forest-trail'),'/zh/escape-room-puzzles/#forest-trail');
});
test('fixed messages preserve customer variables and identical English output',()=>{
 assert.equal(translate('Price {value0}','zh',{value0:'Home <customer input>'}),'价格 Home <customer input>');
 assert.equal(translate('  unknown customer story  ','zh'),'  unknown customer story  ');
 assert.equal(translate('Hello {value0}','en',{value0:'森林'}),'Hello 森林');
 assert.equal(translate({nickname:'Home'},'zh').nickname,'Home');
 for(const [key,value] of Object.entries(dictionaries.zh))assert.deepEqual([...key.matchAll(/\{value\d+\}/g)].map(x=>x[0]).sort(),[...value.matchAll(/\{value\d+\}/g)].map(x=>x[0]).sort(),key);
});
test('Chinese sign-in links localize the return page and Sudoku help preserves its deduction',()=>{
 const before=globalThis.window;globalThis.window={location:{pathname:'/zh/sudoku/play/'}};
 try{const url=new URL(localHref('/en/account/?returnTo=%2Fen%2Fsudoku%2Fplay%2F%3Flevel%3D7'),'https://fixture.invalid');assert.equal(url.pathname,'/zh/account/');assert.equal(url.searchParams.get('returnTo'),'/zh/sudoku/play/?level=7');}finally{if(before===undefined)delete globalThis.window;else globalThis.window=before;}
 const source='Row A is missing 2, 7. At A1, cross out digits already in column 1 or its 3×3 box.';
 assert.equal(sudokuHelpCopy(source,'en'),source);assert.equal(sudokuHelpCopy(source,'zh'),'第 A 行缺少 2, 7。检查 A1，排除第 1 列及所在九宫格中已出现的数字。');
 assert.equal(sudokuHelpCopy('A1 has only one candidate: 7. The other digits already occur in its row, column or box.','zh'),'A1 只剩一个候选数：7。其他数字都已在它所在的行、列或宫中出现。');
});
test('every existing route has a Chinese peer with matching index/privacy rules',async()=>{
 const en=publicPages.filter(p=>p.locale==='en'),zh=publicPages.filter(p=>p.locale==='zh');assert.equal(en.length,89);assert.equal(zh.length,en.length);
 for(const page of en){const translated=zh.find(p=>basePath(p.path)===page.path);assert.equal(translated.indexable,page.indexable,page.path);assert.match(translated.title,/[\u4e00-\u9fff]/,page.path);const html=await readFile('dist/client'+translated.path+'index.html','utf8');assert.match(html,/<html lang="zh-Hans"/);if(page.indexable){assert.match(html,/hreflang="en"/);assert.match(html,/hreflang="zh-Hans"/);}else assert.match(html,/name="robots" content="noindex"/);}
 for(const p of ['/zh/account/','/zh/account/billing/','/zh/orders/private/','/zh/checkout/','/zh/create/','/zh/sudoku/play/'])assert.equal(isAnalyticsPage(p),false,p);
 assert.equal(isAnalyticsPage('/zh/sudoku/techniques/'),true);
});
test('Chinese private order refresh keeps its URL and noindex header',async()=>{
 const paths=[];const response=await worker.fetch(new Request('https://paperadventure.app/zh/orders/fixture/',{headers:{accept:'text/html'}}),{ASSETS:{fetch:async request=>{paths.push(new URL(request.url).pathname);return new Response('fixture shell');}}});
 assert.deepEqual(paths,['/app-shell.txt']);assert.equal(response.status,200);assert.equal(response.headers.get('location'),null);assert.equal(response.headers.get('x-robots-tag'),'noindex');
 const redirect=await worker.fetch(new Request('https://paperadventure.app/zh/sudoku/points/'),{});assert.equal(redirect.headers.get('location'),'https://paperadventure.app/zh/credits/');
});
test('checkout language changes presentation without changing price, identity or currency',()=>{
 const purchase={orderId:'fixture',inlinePrice:{unitAmount:1499,name:'Fixture game'},specHash:'fixed-spec',successUrl:'https://test.invalid/zh/orders/fixture/',cancelUrl:'https://test.invalid/zh/checkout/'};
 const en=checkoutForm(purchase),zh=checkoutForm({...purchase,locale:'zh'});assert.equal(zh.get('locale'),'zh');zh.delete('locale');assert.deepEqual([...zh],[...en]);assert.equal(zh.get('line_items[0][price_data][unit_amount]'),'1499');assert.equal(zh.get('line_items[0][price_data][currency]'),'usd');assert.equal(checkoutForm({...purchase,locale:'evil'}).get('locale'),null);
});
test('English application chunks do not embed the Chinese translation catalog',async()=>{
 const files=(await readdir('dist/client/assets')).filter(f=>f.endsWith('.js'));
 for(const file of files){const code=await readFile('dist/client/assets/'+file,'utf8');assert.ok(!code.includes('"A Sudoku thinking hint costs 1 credit. A next-cell answer costs 3 credits in total for the same board position; upgrade from the hint for 2 more. Previously purchased deep hints stay unlocked and are free to read again.":'),file);}
 assert.ok((await readFile('dist/client/locales/zh.json','utf8')).includes('数独'));
});
test('Chinese offline shell caches its dictionary and keeps English/private caches separate',async()=>{
 const source=await readFile('dist/client/zh/sudoku/sw.js','utf8'),events={},deleted=[];
 const cached=new Response('{"fixture":"中文"}');
 vm.runInNewContext(source,{URL,Response,self:{location:{origin:'https://fixture.invalid'},addEventListener:(name,fn)=>events[name]=fn,clients:{claim:async()=>{}}},caches:{open:async()=>({match:async key=>key==='/locales/zh.json'?cached:undefined}),keys:async()=>['paw-sudoku-shell-en','paw-sudoku-zh-shell-old','private-fixture'],delete:async key=>deleted.push(key)},fetch:async()=>{throw Error('offline');}});
 let response;events.fetch({request:{method:'GET',url:'https://fixture.invalid/locales/zh.json?v=current'},respondWith:p=>response=p});assert.match(await(await response).text(),/中文/);
 let activation;events.activate({waitUntil:p=>activation=p});await activation;assert.deepEqual(deleted,['paw-sudoku-zh-shell-old']);
 for(const path of ['/api/v1/auth/session','/zh/account/overview/','/zh/orders/fixture/']){let intercepted=false;events.fetch({request:{method:'GET',url:'https://fixture.invalid'+path,mode:'navigate'},respondWith:()=>intercepted=true});assert.equal(intercepted,false,path);}
});
test('Chinese plan controls leave every generated story field in its original language',async()=>{
 const {createServer}=await import('vite'),React=await import('react'),{renderToString}=await import('react-dom/server');
 const server=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom',logLevel:'silent'}),before=globalThis.window;
 try{
  globalThis.window={location:{pathname:'/zh/orders/fixture/'}};
  const {PlanPreview}=await server.ssrLoadModule('/src/creatorPlanPreview.jsx');
  const plan={title:'Home',opening:'Account',roles:'Sign in',goal:'Pricing',preparation:'Notes',stages:[{number:1,mechanic:'reasoning',title:'Home',storyContext:'Account',task:'Sign in',teamwork:'Pricing',connection:'Notes'}]};
  const html=renderToString(React.createElement(PlanPreview,{plan}));
  for(const value of ['<h3>Home</h3>','<p>Account</p>','<dd>Sign in</dd>','<dd>Pricing</dd>','<h4>Home</h4>','<p>Sign in</p>','<p>Notes</p>'])assert.ok(html.includes(value),value);
  assert.ok(html.includes('你的')||html.includes('您的'),'the surrounding controls are Chinese');
 }finally{if(before===undefined)delete globalThis.window;else globalThis.window=before;await server.close();}
});
