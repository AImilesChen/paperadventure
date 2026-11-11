import test from 'node:test';
import assert from 'node:assert/strict';
import {accountEntryContext} from '../shared/account-entry.mjs';
import {accountSections,accountSection,gameSummary,sudokuSummary,accountActivity} from '../shared/account-center.mjs';
import {accountReturnPath} from '../shared/account-return.mjs';

test('account navigation preserves explicit destinations and legacy support without admitting new redirect scopes',()=>{
 for(const section of accountSections)assert.equal(accountReturnPath(section.path),section.path);
 assert.equal(accountReturnPath(null),'/en/account/overview/');
 for(const path of ['/en/account/settings/extra/','/en/account/evil/','/en/account/%2f%2fevil.test/','/admin/','//evil.test/en/account/overview/','/en/account/overview/\r\nLocation: https://evil.test'])assert.equal(accountReturnPath(path),'/en/account/overview/');
 assert.equal(accountReturnPath('/en/account/billing/?order=53000000-0000-4000-8000-000000000001'),'/en/account/billing/?order=53000000-0000-4000-8000-000000000001');
 assert.equal(accountSection('/en/my-adventures/','?support=refund'),'billing');
 assert.equal(accountSection('/en/my-adventures/','?view=orders'),'billing');
 assert.equal(accountSection('/en/my-adventures/','','#my-sudoku'),'sudoku');
 assert.equal(accountSection('/en/my-adventures/'),'games');
 assert.equal(accountReturnPath('/en/credits/?pack=ai_credits_300&returnTo=%2Fen%2Fsudoku%2Fplay%2F%3Flevel%3D201'),'/en/credits/?pack=ai_credits_300&returnTo=%2Fen%2Fsudoku%2Fplay%2F%3Flevel%3D201');
});
test('overview distinguishes playable, paid action-needed, unpaid and empty states',()=>{
 const rows=[{id:'ready',status:'published',paid_at:'2026-11-01',product_kind:'ready'},{id:'review',status:'paid',paid_at:'2026-11-01',product_kind:'custom'},{id:'stopped',status:'failed',paid_at:'2026-11-01',product_kind:'custom'},{id:'failed-checkout',status:'failed',product_kind:'custom'},{id:'open',status:'pending_payment'},{id:'expired',status:'pending_payment',checkoutExpired:true},{id:'refunded',status:'refunded',paid_at:'2026-11-01',product_kind:'custom'}];
 const s=gameSummary(rows);assert.equal(s.ready,1);assert.deepEqual(s.pending.map(o=>o.id),['review','stopped']);assert.deepEqual(s.unpaid.map(o=>o.id),['open']);assert.deepEqual(gameSummary([]),{ready:0,pending:[],unpaid:[]});
 assert.equal(sudokuSummary(null),null);const base={state:{highest:0,current:1,sessions:{}},catalog:{publishedCount:300}};
 assert.equal(sudokuSummary(base).label,'Start level 1');assert.equal(sudokuSummary({...base,state:{...base.state,sessions:{one:{level:1}}}}).label,'Continue level 1');assert.equal(sudokuSummary({...base,state:{highest:300,current:300}}).label,'Revisit levels');
});
test('recent activity sorts actual timestamps and omits invalid and unpaid events',()=>{
 const items=accountActivity({orders:[{id:'unpaid',status:'pending_payment',created_at:'2026-11-11 12:00:00'},{id:'bought',status:'published',paid_at:'2026-11-10 12:00:00',title:'Game'}],entries:[{id:1,delta:-3,reason:'Hint used',created_at:Date.parse('2026-11-11T10:00:00Z')},{id:2,created_at:'bad'}]});
 assert.equal(items.length,2);assert.equal(items[0].detail,'-3 AI credits');assert.equal(items[1].at,Date.parse('2026-11-10T12:00:00Z'));assert.equal(items[1].title,'Adventure purchase: Game');assert.deepEqual(accountActivity(),[]);
});

test('credit pack and original game returns survive sign-in presentation without exposing arbitrary query text',()=>{
 const destination='/en/credits/?pack=ai_credits_300&returnTo=%2Fen%2Fsudoku%2Fplay%2F%3Flevel%3D201';
 const c=accountEntryContext(destination);assert.equal(c.destination,destination);assert.equal(c.backPath,destination);assert.match(c.note,/300-credit pack/);
 assert.match(accountEntryContext('/en/credits/?pack=ai_credits_100').note,/100-credit pack/);
 assert.doesNotMatch(accountEntryContext('/en/credits/?pack=untrusted-value').note,/untrusted-value/);
 for(const p of ['/en/sudoku/play/?level=201','/en/escape-room-puzzles/#harbour-route']){const c=accountEntryContext(p);assert.equal(c.destination,p);assert.equal(c.backPath,p);}
});
test('the sign-in entry keeps the existing bounded redirect policy',()=>{
 for(const requested of [null,'https://evil.test/en/credits/','//evil.test/en/credits/','/admin/','/en/account/','/en/sudoku/\\evil']){
  const c=accountEntryContext(requested);assert.equal(c.destination,'/en/account/overview/');assert.equal(c.backPath,'/en/');assert.equal(c.note,'');
 }
 assert.match(accountEntryContext('/en/account/billing/').note,/purchases and payment updates/);
});
