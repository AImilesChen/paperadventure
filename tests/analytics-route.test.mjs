import test from 'node:test';
import assert from 'node:assert/strict';
import { crossesAnalyticsBoundary, isAnalyticsPage } from '../src/analytics-route.mjs';

test('analytics stays on public information pages and off private flows', () => {
  for (const route of ['/en/', '/en/themes/', '/en/themes/celebration/', '/en/pricing/', '/en/help/']) assert.equal(isAnalyticsPage(route), true, route);
  for (const route of ['/en/create/', '/en/checkout/', '/en/orders/demo/', '/en/orders/order-secret/', '/en/my-adventures/', '/en/account/', '/en/help/recover/', '/en/help/report/', '/en/unknown/']) assert.equal(isAnalyticsPage(route), false, route);
  assert.equal(crossesAnalyticsBoundary('/en/pricing/', '/en/checkout/'), true);
  assert.equal(crossesAnalyticsBoundary('/en/orders/order-secret/', '/en/themes/'), true);
  assert.equal(crossesAnalyticsBoundary('/en/themes/', '/en/pricing/'), false);
});

test('released analytics separates cookieless statistics from consent-based measurement', async t => {
  const {createServer}=await import('vite');
  const vite=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom',logLevel:'silent'});
  const previous=Object.fromEntries(['window','document','localStorage'].map(key=>[key,globalThis[key]]));
  const grant={'paw-analytics-choice-v3':'granted'},optout={'paw-basic-analytics-choice-v1':'denied'};
  let fixture=0;
  async function browser({pathname='/en/',origin='https://paperadventure.app',search='',hash='',referrer='',saved={},storageBlocked=false}={}){
    const scripts=[],storage=new Map(Object.entries(saved));let reloads=0;
    globalThis.window={location:{pathname,origin,search,hash,reload(){reloads++;}}};
    globalThis.document={referrer,title:'Public page',createElement(){return {attributes:{},setAttribute(key,value){this.attributes[key]=value;}};},head:{appendChild(script){scripts.push(script);}}};
    globalThis.localStorage={getItem(key){if(storageBlocked)throw Error('Storage blocked');return storage.get(key)||null;},setItem(key,value){if(storageBlocked)throw Error('Storage blocked');storage.set(key,value);}};
    const analytics=await vite.ssrLoadModule('/src/analytics.js?consent-fixture='+ ++fixture);
    return {analytics,scripts,storage,reloads:()=>reloads};
  }
  const sources=f=>f.scripts.map(script=>script.src);
  const assertBasic=f=>{
    assert.deepEqual(sources(f),['https://analytics.ahrefs.com/analytics.js','https://plausible.shipsolo.io/js/script.js']);
    assert.equal(f.scripts[0].attributes['data-key'],'ByrV8jZLbS8h7R1DqVCbJw');
    assert.equal(f.scripts[1].attributes['data-domain'],'paperadventure.app');
    assert.ok(f.scripts.every(script=>script.async));
    assert.equal(window.gtag,undefined);assert.equal(window.clarity,undefined);
  };
  try{
    await t.test('basic scripts start before any choice; old grants never start cookie analytics',async()=>{
      for(const saved of [{},{'paw-analytics-choice-v2':'granted','paw-ahrefs-choice-v1':'granted'}]){
        const f=await browser({saved});
        assert.deepEqual({...f.analytics.enabledAnalyticsProviders},{ga4:true,clarity:true,ahrefs:true,plausible:true});
        assert.equal(f.analytics.analyticsChoice(),null);f.analytics.startAnalytics();assertBasic(f);
        assert.deepEqual([...f.analytics.analyticsProviderNames('enhanced')],['Google Analytics 4','Microsoft Clarity']);
      }
    });
    await t.test('a current grant adds exactly GA4 and Clarity without duplicating basic scripts',async()=>{
      const f=await browser();f.analytics.startAnalytics();f.analytics.saveAnalyticsChoice('granted');
      assert.equal(f.scripts.length,4);
      assert.ok(sources(f).includes('https://www.googletagmanager.com/gtag/js?id=G-0KQ8D1T7XJ'));
      assert.ok(sources(f).includes('https://www.clarity.ms/tag/yu1afz86dr'));
      assert.equal(f.storage.get('paw-analytics-choice-v3'),'granted');
      f.analytics.startAnalytics();f.analytics.trackPageView();assert.equal(f.scripts.length,4);
      const commands=window.dataLayer.map(args=>Array.from(args));
      assert.equal(commands.filter(args=>args[0]==='event'&&args[1]==='page_view').length,1);
      assert.ok(commands.some(args=>args[0]==='config'&&args[2].allow_google_signals===false));
      assert.ok(commands.some(args=>args[0]==='consent'&&args[1]==='default'&&args[2].ad_storage==='denied'));
      assert.ok(window.clarity.q.some(args=>args[0]==='consentv2'&&args[1].ad_Storage==='denied'));
    });
    await t.test('declining enhanced leaves basic active and does not reload unnecessarily',async()=>{
      const f=await browser();f.analytics.startAnalytics();f.analytics.saveAnalyticsChoice('denied');assertBasic(f);assert.equal(f.reloads(),0);
      const after=await browser({saved:{'paw-analytics-choice-v3':'denied'}});after.analytics.startAnalytics();assertBasic(after);
    });
    await t.test('withdrawal persists denial, sends denied signals and unloads enhanced collectors',async()=>{
      const f=await browser({saved:grant});f.analytics.startAnalytics();assert.equal(f.scripts.length,4);
      f.analytics.saveAnalyticsChoice('denied');assert.equal(f.storage.get('paw-analytics-choice-v3'),'denied');assert.equal(f.reloads(),1);
      assert.equal(window.dataLayer.at(-1)[2].analytics_storage,'denied');assert.equal(window.clarity.q.at(-1)[1].analytics_Storage,'denied');
      const count=window.dataLayer.length;f.analytics.trackEvent('theme_open');assert.equal(window.dataLayer.length,count);
      const after=await browser({saved:Object.fromEntries(f.storage)});after.analytics.startAnalytics();assertBasic(after);
    });
    await t.test('basic opt-out is independent, persisted before reload, and can disable all four',async()=>{
      const f=await browser();f.analytics.startAnalytics();f.analytics.saveAnalyticsPreferences({basic:false,enhanced:'denied'});
      assert.equal(f.storage.get('paw-basic-analytics-choice-v1'),'denied');assert.equal(f.reloads(),1);
      const after=await browser({saved:Object.fromEntries(f.storage)});after.analytics.startAnalytics();assert.equal(after.scripts.length,0);
      after.analytics.saveAnalyticsPreferences({basic:false,enhanced:'granted'});assert.equal(after.scripts.length,2);
      assert.ok(sources(after).every(src=>!src.includes('ahrefs')&&!src.includes('plausible')));
    });
    await t.test('no collector starts on private, unknown or admin routes even with a grant',async()=>{
      for(const pathname of ['/en/create/','/en/checkout/','/en/orders/private-order/','/en/my-adventures/','/en/account/','/en/help/report/','/en/help/recover/','/admin/','/api/v1/auth/session','/en/not-a-page/']){
        const f=await browser({pathname,saved:grant});assert.equal(f.analytics.analyticsLocationAllowed(),false,pathname);f.analytics.startAnalytics();assert.equal(f.scripts.length,0,pathname);
      }
    });
    await t.test('preview aliases and local development never send production analytics',async()=>{
      for(const origin of ['http://127.0.0.1:5416','https://preview.paperadventure.app','https://untrusted.example']){
        const f=await browser({origin,saved:grant});f.analytics.startAnalytics();assert.equal(f.scripts.length,0,origin);
      }
    });
    await t.test('private referrers, tokens and arbitrary URL parameters cannot reach vendors',async()=>{
      for(const options of [
        {referrer:'https://paperadventure.app/en/orders/private-order/?token=private'},
        {referrer:'https://paperadventure.app/en/pricing/?email=private@example.com'},
        {search:'?token=private'},{search:'?email=private@example.com'},
        {search:'?utm_source=private%40example.com'},{hash:'#private-token'}
      ]){const f=await browser({...options,saved:grant});f.analytics.startAnalytics();assert.equal(f.scripts.length,0,JSON.stringify(options));}
      for(const referrer of ['https://paperadventure.app/','https://paperadventure.app/en/pricing/','https://www.producthunt.com/products/paper-adventure-workshop']){
        const f=await browser({referrer,search:'?utm_source=producthunt&utm_medium=referral',saved:grant});f.analytics.startAnalytics();assert.equal(f.scripts.length,4);
      }
    });
    await t.test('custom events reject free text and use canonical page URLs',async()=>{
      const f=await browser({saved:grant,search:'?utm_source=producthunt'});f.analytics.startAnalytics();
      f.analytics.trackEvent('theme_open',{theme:'dinosaur',email:'private@example.com',idea:'a private story',url:'https://private.example'});
      const event=Array.from(window.dataLayer.at(-1));assert.deepEqual(event.slice(0,2),['event','theme_open']);assert.deepEqual(event[2],{theme:'dinosaur',page_path:'/en/'});
      const view=window.dataLayer.find(args=>args[1]==='page_view');assert.equal(view[2].page_location,'https://paperadventure.app/en/');
    });
    await t.test('unavailable storage keeps both preferences for the current document',async()=>{
      const f=await browser({storageBlocked:true});f.analytics.startAnalytics();assertBasic(f);
      f.analytics.saveAnalyticsPreferences({basic:false,enhanced:'denied'});assert.equal(f.analytics.basicAnalyticsAllowed(),false);assert.equal(f.analytics.analyticsChoice(),'denied');assert.equal(f.reloads(),1);
    });
    await t.test('invalid preferences cannot implicitly enable collection',async()=>{
      const f=await browser({saved:optout});assert.throws(()=>f.analytics.saveAnalyticsChoice('yes'),/Invalid analytics choice/);
      assert.throws(()=>f.analytics.saveAnalyticsPreferences({basic:'yes',enhanced:'granted'}),/Invalid basic/);f.analytics.startAnalytics();assert.equal(f.scripts.length,0);
    });
  }finally{
    for(const [key,value]of Object.entries(previous)){if(value===undefined)delete globalThis[key];else globalThis[key]=value;}
    await vite.close();
  }
});
