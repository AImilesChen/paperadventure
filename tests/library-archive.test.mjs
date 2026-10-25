import test from 'node:test';
import assert from 'node:assert/strict';
import {matchesRemovedDraft,clearRemovedLocalDraft} from '../src/libraryArchive.mjs';
import {normalizeDraft,draftSpec} from '../src/creatorDraft.mjs';

test('cleanup clears only the matching removed browser draft, including a different wizard step',()=>{
  const old=normalizeDraft({idea:'An upside-down hotel',players:'8',age:'8',step:5});
  const spec=draftSpec(old);spec.players=8;
  assert.equal(matchesRemovedDraft({...old,step:2},[spec]),true);
  assert.equal(matchesRemovedDraft({...old,idea:'A new train mystery'},[spec]),false);
  assert.equal(matchesRemovedDraft({...old,preferences:{...old.preferences,avoid:'Spiders'}},[spec]),false);
  const values=new Map([['paw-draft',JSON.stringify(old)]]);
  const storage={getItem:key=>values.get(key),removeItem:key=>values.delete(key)};
  assert.equal(clearRemovedLocalDraft(storage,[spec]),true);assert.equal(values.has('paw-draft'),false);
  values.set('paw-draft',JSON.stringify({...old,idea:'New idea'}));
  assert.equal(clearRemovedLocalDraft(storage,[spec]),false);assert.equal(values.has('paw-draft'),true);
});
