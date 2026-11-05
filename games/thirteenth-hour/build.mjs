import fs from 'node:fs/promises';import path from 'node:path';import {fileURLToPath} from 'node:url';
const dir=path.dirname(fileURLToPath(import.meta.url)),out=path.resolve(dir,'../../output/private/thirteenth-hour');await fs.mkdir(out,{recursive:true});
const [data,model,art,app,css]=await Promise.all(['game.json','model.mjs','art.mjs','app.js','style.css'].map(n=>fs.readFile(path.join(dir,n),'utf8')));
const script=`const DATA=${data};\n${model.replaceAll('export ','')}\n${art.replaceAll('export ','')}\n${app}`;
await fs.writeFile(path.join(out,'companion.html'),`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>The Clockmaker's Thirteenth Hour | Paper Adventure</title><style>${css}</style></head><body><div id="app"></div><noscript>Use the complete printed game with the separate Adult Guide.</noscript><script>${script.replaceAll('</script','<\\/script')}</script></body></html>`);
console.log('Built separate offline companion; live site unchanged.');

