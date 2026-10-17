// Explicit localhost-only scripted demo. Live routes always use real providers.
import {createServer} from 'node:http';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {handleProductionApi} from '../backend/production-worker.mjs';
import {signAccessToken} from '../backend/security.mjs';
import {planFixture} from '../tests/fixtures/creator-plan-fixture.mjs';
const db=new DatabaseSync(':memory:');
const migrations=new URL('../backend/migrations/',import.meta.url);
for(const file of readdirSync(migrations).filter(name=>name.endsWith('.sql')).sort())db.exec(readFileSync(new URL(file,migrations),'utf8'));
const binding={prepare(sql){return {bind(...values){const stmt=db.prepare(sql);return {first:async()=>stmt.get(...values)||null,all:async()=>({results:stmt.all(...values)}),run:async()=>({meta:{changes:Number(stmt.run(...values).changes)}})};}};},async batch(statements){db.exec('BEGIN');try{const result=await Promise.all(statements.map(s=>s.run()));db.exec('COMMIT');return result;}catch(error){db.exec('ROLLBACK');throw error;}}};
const secret=randomUUID();
const token=await signAccessToken(secret,{scope:'session',emailHash:'local-demo-owner',exp:Math.floor(Date.now()/1000)+86400});
const env={DB:binding,SESSION_SECRET:secret,PUBLIC_ORIGIN:'http://127.0.0.1:5192',PROPOSALS_ENABLED:'false',AI_PROVIDER:'deepseek',DEEPSEEK_API_KEY:'local-scripted-fixture',SUPPORTED_AGE_MIN:6,SUPPORTED_AGE_MAX:12,HOME_PLAYER_MAX:12,CLASSROOM_STUDENT_MAX:35,FETCH:async(_,options)=>{const spec=JSON.parse(JSON.parse(options.body).input);return Response.json({output:[{content:[{type:'output_text',text:JSON.stringify({proposals:[planFixture(spec),planFixture(spec,'mission')]})}]}]});}};
const server=createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,'http://127.0.0.1:5192');
    let response;
    if(url.pathname==='/api/v1/health')response=Response.json({status:'creator_local_demo',checkout:false,checkoutMode:'closed',generation:false,proposals:false,account:true,sample:false,legal:false});
    else if(url.pathname==='/api/v1/auth/session')response=Response.json({authenticated:true});
    else {
      const chunks=[];for await(const chunk of req){chunks.push(chunk);if(chunks.reduce((total,c)=>total+c.length,0)>16384)throw new Error('Request too large');}
      const headers=new Headers(req.headers);headers.set('cookie',`paw_session=${token}`);headers.set('cf-connecting-ip','127.0.0.1');
      const request=new Request(url,{method:req.method,headers,...(['GET','HEAD'].includes(req.method)?{}:{body:Buffer.concat(chunks)})});
      response=await handleProductionApi(request,env);
    }
    res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
  }catch{res.writeHead(500,{'content-type':'application/json'});res.end(JSON.stringify({error:{message:'Local demo request failed.'}}));}
});
server.listen(5191,'127.0.0.1',()=>process.stdout.write('Creator scripted demo API: http://127.0.0.1:5191 (no AI or payment)\n'));
