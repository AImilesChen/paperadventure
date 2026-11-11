import {readFile,writeFile} from 'node:fs/promises';
import {DatabaseSync} from 'node:sqlite';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const baseline='../sudoku-rules-v48';
const current=new DatabaseSync('tmp/local/progress.sqlite',{readOnly:true});
const original=new DatabaseSync(baseline+'/tmp/local/progress.sqlite',{readOnly:true});
const restored={};
for(const table of ['sudoku_accounts','sudoku_speed_attempts','sudoku_speed_reviews']){
 const rows=db=>db.prepare('SELECT * FROM '+table+' ORDER BY 1').all();
 assert.deepEqual(rows(current),rows(original));restored[table]=rows(current).length;
}
const empty={};
for(const table of ['sudoku_point_orders','sudoku_point_grants','sudoku_point_refunds','sudoku_point_events','sudoku_point_customers','sudoku_point_reviews','sudoku_point_spends','sudoku_point_consents']){
 empty[table]=current.prepare('SELECT COUNT(*) n FROM '+table).get().n;assert.equal(empty[table],0);
}
const opening=current.prepare('SELECT COUNT(*) n FROM sudoku_wallet_entries').get().n;assert.equal(opening,restored.sudoku_accounts);
current.close();original.close();
const protectedFiles={};
for(const file of ['backend/sudoku/puzzles.json','backend/sudoku/bank-stock.json','backend/sudoku/bank-policy.json','shared/sudoku/engine.mjs','shared/sudoku/catalog.mjs','shared/sudoku/ranking.mjs','shared/sudoku/first-clear-ranking.mjs']){
 const a=await readFile(file),b=await readFile(baseline+'/'+file);assert(a.equals(b));protectedFiles[file]=createHash('sha256').update(a).digest('hex');
}
const apiBundle=await readFile('backend/tmp/qa/api-bundle/production-worker.js','utf8');assert(apiBundle.includes('sudoku_point_consents'));assert(!apiBundle.includes('sk_test_local_simulator_not_a_stripe_key'));assert(!apiBundle.includes('class LocalPointsProvider'));
const get=async p=>{const r=await fetch('http://127.0.0.1:5651'+p);assert.equal(r.status,200);return r;};
const health=await(await get('/api/v1/sudoku/health')).json();assert.equal(health.pointsVersion,1);
const catalog=await(await get('/api/v1/sudoku/points/catalog')).json();assert.equal(catalog.mode,'test');assert.equal(catalog.enabled,true);assert(!JSON.stringify(catalog).includes('price_local'));
const page=await(await get('/en/sudoku/points/')).text(),billing=await(await get('/en/account/billing/')).text(),map=await(await get('/sitemap.xml')).text();
assert(page.includes('https://paperadventure.app/en/sudoku/points/'));assert(page.includes('$2.99'));assert(page.includes('$6.99'));assert(billing.includes('name="robots" content="noindex"'));assert(map.includes('/en/sudoku/points/'));assert(!map.includes('/en/account/billing/'));
const report={version:'v49',environment:'isolated local simulator only',restored,empty,openingEntries:opening,protectedFiles,health,catalog,productionBundleExcludesSimulator:true,technicalSeo:true};
await writeFile('tmp/qa/local-verification-v49.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({restored,empty,openingEntries:opening,pointsVersion:health.pointsVersion,protectedFiles:Object.keys(protectedFiles).length,technicalSeo:true,productionBundleExcludesSimulator:true}));
