import test from 'node:test';
import assert from 'node:assert/strict';
import {accountEntryContext} from '../shared/account-entry.mjs';

test('credit pack and original game returns survive sign-in presentation without exposing arbitrary query text',()=>{
 const destination='/en/credits/?pack=ai_credits_300&returnTo=%2Fen%2Fsudoku%2Fplay%2F%3Flevel%3D201';
 const c=accountEntryContext(destination);assert.equal(c.destination,destination);assert.equal(c.backPath,destination);assert.match(c.note,/300-credit pack/);
 assert.match(accountEntryContext('/en/credits/?pack=ai_credits_100').note,/100-credit pack/);
 assert.doesNotMatch(accountEntryContext('/en/credits/?pack=untrusted-value').note,/untrusted-value/);
 for(const p of ['/en/sudoku/play/?level=201','/en/escape-room-puzzles/#harbour-route']){const c=accountEntryContext(p);assert.equal(c.destination,p);assert.equal(c.backPath,p);}
});
test('the sign-in entry keeps the existing bounded redirect policy',()=>{
 for(const requested of [null,'https://evil.test/en/credits/','//evil.test/en/credits/','/admin/','/en/account/','/en/sudoku/\\evil']){
  const c=accountEntryContext(requested);assert.equal(c.destination,'/en/my-adventures/');assert.equal(c.backPath,'/en/');assert.equal(c.note,'');
 }
 assert.match(accountEntryContext('/en/account/billing/').note,/balance, purchases and activity/);
});
