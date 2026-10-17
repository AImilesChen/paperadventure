import { chromium } from 'playwright';
import { publicCatalog } from '../shared/catalog.mjs';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
const browser = await chromium.launch({headless:true});
mkdirSync('output/browser-qa',{recursive:true});
for (const width of [1440,390]) {
 const page=await browser.newPage({viewport:{width,height:900}});
 await page.route('**/api/v1/health',r=>r.fulfill({json:{status:'configured_runtime',account:true}}));
 await page.route('**/api/v1/catalog',r=>r.fulfill({json:publicCatalog()}));
 await page.route('**/api/v1/auth/session',r=>r.fulfill({json:{authenticated:true}}));
 await page.route('**/api/v1/my-orders',r=>r.fulfill({json:{orders:[
 {id:'qa-paid',sku:'ready_home',product_kind:'ready',status:'published',title:"The Little Dinosaur's Way Home",setting:'home',image:'/assets/celebration-home-v0.1.jpg',amount_total:999,currency:'USD',created_at:'2026-10-10 10:00:00',paid_at:'2026-10-10 10:01:00',filesReady:true,accessExpiresAt:'2027-10-10 10:01:00'},
 {id:'qa-unpaid',sku:'ready_home',product_kind:'ready',status:'pending_payment',title:'Unpaid Dinosaur',setting:'home',amount_total:999,created_at:'2026-10-10 09:00:00',filesReady:false}
 ]}}));
 await page.route('**/api/v1/my-draft',r=>r.fulfill({json:{draft:{customIdea:'A floating garden',setting:'home',players:4}}}));
 await page.route('**/api/v1/orders/qa-paid',r=>r.fulfill({json:{id:'qa-paid',kind:'ready',sku:'ready_home',status:'published',amountTotal:999,currency:'USD',filesReady:true,revisionLimit:0,accessExpiresAt:'2027-10-10 10:01:00'}}));
 await page.route('**/api/v1/orders/qa-paid/issues',r=>r.fulfill({json:{cases:[]}}));
 let failGuide=false;
 await page.route('**/api/v1/files/qa-paid/*',r=>failGuide && r.request().url().includes('/guide?') ? r.fulfill({status:403,json:{error:{message:'Download access is unavailable.'}}}) : r.fulfill({contentType:'application/pdf',body:Buffer.from('%PDF-1.4\nQA '+(r.request().url().includes('/guide?')?'guide':'player')+' PDF bytes\n')}));
 await page.goto('http://127.0.0.1:4173/en/my-adventures/');
 await page.getByRole('heading',{name:"The Little Dinosaur's Way Home",exact:true}).waitFor();
 if(await page.locator('.shelf-game').count()!==1) throw Error('Unpaid record leaked into purchased games');
 if(!await page.getByRole('link',{name:/Player Pack/}).isVisible()) throw Error('Direct download missing');
 await page.getByLabel('Download paper size').selectOption('Letter');
 if(!(await page.getByRole('link',{name:/Player Pack/}).getAttribute('href')).endsWith('paper=Letter')) throw Error('Wrong paper download');
 await page.screenshot({path:'output/browser-qa/library-'+width+'.png',fullPage:true});
 await page.getByRole('button',{name:/Order history/}).click();
 if(await page.locator('.shelf-game').count()!==2) throw Error('History lost records');
 if(!await page.getByText('Unfinished checkout · payment not confirmed',{exact:true}).isVisible()) throw Error('Unpaid record misleading');
 await page.getByRole('button',{name:/My drafts/}).click();
 if(!await page.getByRole('heading',{name:'A floating garden'}).isVisible()) throw Error('Draft separation broken');
 if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+5)) throw Error('Mobile overflow');
 await page.goto('http://127.0.0.1:4173/en/orders/qa-paid/');
 await page.getByRole('heading',{name:'Download your complete game',exact:true}).waitFor();
 await page.getByLabel('Paper size',{exact:true}).selectOption('Letter');
 const downloadPromise=page.waitForEvent('download');
 await page.getByRole('button',{name:'Download complete game · ZIP',exact:true}).click();
 const download=await downloadPromise; const bytes=readFileSync(await download.path());
 let cursor=0; const names=[];
 while(bytes.readUInt32LE(cursor)===0x04034b50) {
  const size=bytes.readUInt32LE(cursor+18), length=bytes.readUInt16LE(cursor+26), extra=bytes.readUInt16LE(cursor+28);
  names.push(bytes.subarray(cursor+30,cursor+30+length).toString());
  const payload=bytes.subarray(cursor+30+length+extra,cursor+30+length+extra+size);
  if(!payload.toString().startsWith('%PDF-1.4')) throw Error('ZIP altered PDF bytes');
  cursor+=30+length+extra+size;
 }
 if(names.length!==2 || !names.every(name=>name.endsWith('-Letter.pdf'))) throw Error('ZIP must contain the two selected-size PDFs');
 if(!await page.getByLabel('What happened?').isVisible()) throw Error('Feedback form must remain expanded');
 const hierarchy=await page.evaluate(()=>{const zip=document.querySelector('.complete-pack-button'), report=document.querySelector('.order-feedback button');return {zipWidth:zip.getBoundingClientRect().width,reportWidth:report.getBoundingClientRect().width,zipColor:getComputedStyle(zip).backgroundColor,reportColor:getComputedStyle(report).backgroundColor};});
 if(hierarchy.zipWidth<=hierarchy.reportWidth || hierarchy.zipColor===hierarchy.reportColor) throw Error('Feedback action competes with primary download');
 await page.screenshot({path:'output/browser-qa/order-download-'+width+'.png',fullPage:true});
 failGuide=true; let downloads=0; page.on('download',()=>downloads++);
 await page.getByRole('button',{name:'Download complete game · ZIP',exact:true}).click();
 await page.getByRole('alert').filter({hasText:'Download access is unavailable.'}).waitFor();
 if(downloads) throw Error('A failed authorized PDF produced a partial ZIP');
 await page.close();
}
await browser.close(); console.log('Library fixture QA passed on desktop and mobile; no live account or payments used.');
