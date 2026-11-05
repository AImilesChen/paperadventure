import fs from 'node:fs/promises';import path from 'node:path';import {fileURLToPath}from'node:url';
import {initialState}from'./model.mjs';import{frontArt,backArt,baseArt,boardArt,coverArt,assemblyArt,foldArt,turnArt,localRoadArt,svg}from'./art.mjs';
const dir=path.dirname(fileURLToPath(import.meta.url)),out=path.resolve(dir,'../../output/private/fold-city-v2');await fs.mkdir(out,{recursive:true});
const [json,policy,model,art,app,css,journey,reachable,rescues]=await Promise.all(['game.json','policy.json','model.mjs','art.mjs','app.js','style.css','journey.mjs','reachable.json','rescues.json'].map(n=>fs.readFile(path.join(dir,n),'utf8'))),d=JSON.parse(json);
const strip=s=>s.replace(/^import .*;\r?\n/gm,'').replaceAll('export ','');
const script=`const DATA=${json};\nconst POLICY=${policy};\nconst KNOWN=new Set(${reachable});\nconst RESCUES=${rescues};\n${strip(model)}\n${strip(journey)}\n${strip(art)}\n${app}`;
await fs.writeFile(path.join(out,'companion.html'),`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>The Secret of Fold City | Paper Adventure</title><style>${css}</style></head><body><div id="app"></div><noscript>Play the complete paper game with its separate Adult Guide. This optional companion requires JavaScript.</noscript><script>${script.replaceAll('</script','<\\/script')}</script></body></html>`);
const arts={base:baseArt(d),initial:boardArt(d),cover:coverArt(),assembly:assemblyArt(d),fold:foldArt(d),turn:turnArt(d)};
for(let k=0;k<3;k++){arts['front-'+d.tiles[k].id]=frontArt(d,k);arts['back-'+d.tiles[k].id]=backArt(d,k);}
const solutions=JSON.parse(await fs.readFile(path.join(dir,'solutions.json'),'utf8'));
arts['hint-garden']=localRoadArt(d,solutions.gardenFirst[6].after,0);arts['hint-bindery']=localRoadArt(d,solutions.gardenFirst[14].after,1);
for(const rescue of JSON.parse(rescues))arts['rescue-'+rescue.id]=boardArt(d,rescue.state);
for(const [name,route]of Object.entries(solutions))for(const id of ['G','W','F','M']){const step=route.find(v=>v.after.at===id);if(step)arts[name+'-'+id]=boardArt(d,step.after,{trace:step.path});}
await fs.mkdir(path.join(out,'art'),{recursive:true});for(const [name,v]of Object.entries(arts))await fs.writeFile(path.join(out,'art',name+'.svg'),svg(v));
await fs.writeFile(path.join(out,'print-art.json'),JSON.stringify(arts));console.log('Built self-contained companion and shared vector print artwork.');
