import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {publicCatalog} from '../shared/sudoku/catalog.mjs';
import {validateCatalog} from '../shared/sudoku/catalog-model.mjs';

export function assertAppendOnlyUpgrade(previous,next){
 validateCatalog(previous);validateCatalog(next);
 assert(next.publishedCount>=previous.publishedCount,'Refusing a bank downgrade: retain every published level when rolling back code');
 for(const [i,p]of previous.levels.entries())assert.deepEqual(next.levels[i],p,'A published puzzle changed at level '+(i+1));
}
export async function checkUpgrade(origin='https://paperadventure.app',fetcher=fetch){
 const h=await fetcher(origin+'/api/v1/sudoku/health',{signal:AbortSignal.timeout(20000)});
 assert(h.ok,'Existing Sudoku health could not be checked; deployment stopped');const health=await h.json();
 if(health.release==='sudoku-v30'&&health.leaderboardVersion===2){
  assert.equal(health.ready,true);assert.equal(health.weeklyRetired,true);
  // The old dispatcher does not have /catalog. Its generic GET fallback would
  // create a guest and return 415, so inspect the known read-only health first.
  return{needsDeployment:true};
 }
 assert.equal(health.release,'sudoku-v40','Unexpected API release; review before changing the bank');
 assert.ok([3,4].includes(health.leaderboardVersion),'Unexpected leaderboard protocol; deployment stopped');assert.equal(health.ready,true);
 const r=await fetcher(origin+'/api/v1/sudoku/catalog',{signal:AbortSignal.timeout(20000),headers:{'cache-control':'no-cache'}});
 assert(r.ok,'Existing catalogue could not be checked; deployment stopped');
 const {catalog}=await r.json();assertAppendOnlyUpgrade(catalog,publicCatalog);
 return{needsDeployment:catalog.version!==publicCatalog.version};
}
export async function needsDeployment(origin='https://paperadventure.app',fetcher=fetch){
 const result=await checkUpgrade(origin,fetcher);if(result.needsDeployment)return true;
 const r=await fetcher(origin+'/en/sudoku/levels/',{signal:AbortSignal.timeout(20000),headers:{'cache-control':'no-cache'}});
 assert(r.ok,'Existing site catalogue could not be checked; retry rather than assume it deployed');
 return !(await r.text()).includes(`data-sudoku-catalog="${publicCatalog.version}"`);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 if(process.argv.includes('--needs-deploy'))console.log(String(await needsDeployment()));
 else{await checkUpgrade();console.log('Published Sudoku prefix retained; append-only deployment allowed.');}
}
