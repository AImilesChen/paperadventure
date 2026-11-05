import {createHash} from 'node:crypto';
import fs from 'node:fs/promises';import path from 'node:path';import{fileURLToPath}from'node:url';
import{artwork}from'./art.mjs';
const dir=path.dirname(fileURLToPath(import.meta.url)),out=path.resolve(dir,'../../output/private/last-letter-v2');await fs.mkdir(out,{recursive:true});
const [data,model,art,app,css]=await Promise.all(['game.json','model.mjs','art.mjs','app.js','style.css'].map(n=>fs.readFile(path.join(dir,n),'utf8')));
const script=`const DATA=${data};\n${model.replaceAll('export ','')}\n${art.replaceAll('export ','')}\n${app}`;
await fs.writeFile(path.join(out,'companion.html'),`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>The Last Letter Before the Storm | Paper Adventure</title><style>${css}</style></head><body><div id="app"></div><noscript>JavaScript is off. Play the complete paper adventure using the separate Adult Guide and Player Pack.</noscript><script>${script.replaceAll('</script','<\\/script')}</script></body></html>`);
await fs.mkdir(path.join(out,'art'),{recursive:true});
const assets=JSON.parse(await fs.readFile(path.join(dir,'assets/manifest.json'),'utf8'));
if(assets.length!==7||new Set(assets.map(a=>a.name)).size!==7)throw Error('Invalid original artwork manifest');
const sha=b=>createHash('sha256').update(b).digest('hex');
for(const kind of ['harbour','envelope','boat','dock','photos','signals','streets']){
 const svg=artwork(kind,JSON.parse(data)).replaceAll('\r\n','\n'),asset=assets.find(a=>a.name===kind);
 const png=await fs.readFile(path.join(dir,'assets',kind+'.png'));
 if(!asset||sha(svg)!==asset.svgSha256||sha(png)!==asset.pngSha256)throw Error('Artwork provenance mismatch: '+kind);
 await fs.writeFile(path.join(out,'art',kind+'.svg'),svg);await fs.writeFile(path.join(out,'art',kind+'.png'),png);
}
console.log('Built independent offline companion. No public route or catalog changes.');
