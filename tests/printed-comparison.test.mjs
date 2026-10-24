import test from 'node:test';
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {createServer} from 'vite';
import {printedChanges,changesForRole,wordChanges} from '../src/printedChanges.mjs';
import {matchPrintedPassage} from '../src/pdfTextMatch.mjs';

const current=[1,2,3,4,5].map(number=>({number,title:`Checkpoint ${number}`,storyContext:'The keeper needs a checked record.',task:'Compare the printed pieces.',clue:'Ask a partner to read the rule. Keep the printed order.',hint:'Check every printed condition.'}));
const candidate=structuredClone(current);
candidate[1].clue='Read one sentence at a time. Keep the printed order.';
candidate[1].hint='Read the printed rule aloud before checking each piece.';

test('checkpoint differences are based on current printed fields, isolate the chosen stage and identify changed documents',()=>{
 const result=printedChanges(current,candidate,{kind:'checkpoint',stageNumber:2});
 assert.deepEqual(result.changed.map(item=>item.key),['clue','hint']);assert.equal(result.unchanged.length,3);
 assert.equal(changesForRole(result.changed,'player').length,1);assert.equal(changesForRole(result.changed,'guide').length,1);
 const untouched=structuredClone(candidate);untouched[3].clue='Some unrelated candidate change.';
 assert.deepEqual(printedChanges(current,untouched,{kind:'checkpoint',stageNumber:2}),result);
 assert.equal(printedChanges(current,candidate).changed.length,2);
 assert.equal(printedChanges(current,current).changed.length,0);
});
for(const [before,after] of [
 ['Read with a partner.','Read one sentence at a time.'],['Same text.','Same text.'],['','A new hint.'],['Old hint.',''],
 ["Keep O'Reilly’s key: 2-3-4-1.","Read O'Reilly’s key: 2-3-4-1."],['读一句，再核对。','一次读一句，再核对。'],['<script>unsafe()</script>','<strong>Text only</strong>'],['a '.repeat(600),'b '.repeat(600)],
])test(`word differences preserve exact original and candidate characters (${before.length}/${after.length})`,()=>{
 const parts=wordChanges(before,after);
 assert.equal(parts.filter(x=>x.type!=='added').map(x=>x.text).join(''),before);
 assert.equal(parts.filter(x=>x.type!=='removed').map(x=>x.text).join(''),after);
 if(before===after)assert.ok(parts.every(x=>x.type==='same'));
});

test('PDF passage locations require a unique complete match, including across wrapped text lines',()=>{
 const items=[{str:'CHECKPOINT 2'},{str:'Read one sentence at a time.'},{str:'Point to each printed piece as you read.'},{str:'Choose the matching word.'}];
 assert.deepEqual(matchPrintedPassage(items,'Read one sentence at a time. Point to each printed piece as you read.'),[1,2]);
 assert.equal(matchPrintedPassage([...items,...items],'Read one sentence at a time.'),null);
 assert.equal(matchPrintedPassage(items,'Different wording.'),null);assert.equal(matchPrintedPassage(items,''),null);
 assert.equal(matchPrintedPassage([{str:'Codes only'}],'Code'),null);
 assert.deepEqual(matchPrintedPassage([{str:'The keeper\'s rule: "read".'}],'The keeper’s rule: “read”.'),[0]);
});

test('readable comparison renders actual removed/added wording before optional PDF controls, without embedding customer HTML',async()=>{
 const vite=await createServer({server:{middlewareMode:true},appType:'custom',logLevel:'silent'});
 try{
  const {default:Comparison}=await vite.ssrLoadModule('/src/printedComparison.jsx');
  const workspace={version:2,paper:'A4',stages:current,checkpointPages:{2:{player:4,guide:3}}};
  const pending={id:'candidate',kind:'checkpoint',stageNumber:2,status:'ready',baseVersion:2,stages:candidate,checkpointPages:workspace.checkpointPages};
  const html=renderToStaticMarkup(createElement(Comparison,{workspace,candidate:pending,orderId:'example',guideLabel:'Host Guide'}));
  assert.match(html,/What changed in checkpoint 2/);assert.match(html,/Player Pack · 1 changed/);assert.match(html,/Host Guide · 1 changed/);
  assert.match(html,/<del>/);assert.match(html,/<mark>/);assert.match(html,/Original · version 2/);assert.match(html,/Modified · not accepted/);
  assert.match(html,/Unchanged checkpoint text/);assert.doesNotMatch(html,/<canvas/);
  assert.match(html,/printed puzzle pieces, rules, choices and answers/);assert.match(html,/switches both PDFs together/);
  const guideOnly=structuredClone(current);guideOnly[1].hint='<script>do not execute</script>';
  const guide=renderToStaticMarkup(createElement(Comparison,{workspace,candidate:{...pending,stages:guideOnly},orderId:'example',guideLabel:'Host Guide'}));
  assert.match(guide,/Adult hint/);assert.match(guide,/Player Pack · 0 changed/);assert.match(guide,/&lt;script&gt;/);assert.doesNotMatch(guide,/<script>/);
  const preview=renderToStaticMarkup(createElement(Comparison,{workspace,orderId:'example',guideLabel:'Host Guide'}));
  assert.match(preview,/PDF zoom/);assert.match(preview,/100%/);assert.match(preview,/150%/);assert.match(preview,/200%/);assert.match(preview,/Full screen/);
 }finally{await vite.close();}
});
