import {creditsContext,creditsHealth} from '../backend/credits/context.mjs';
import {creditGameHelpApi} from '../backend/credits/game-help.mjs';
import {createPolicyDocuments} from '../shared/legal-documents.mjs';
import http from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {sudokuApi,D1SudokuStore} from '../backend/sudoku/api.mjs';
import {pointsApi,pointsWebhook,PointsStore} from '../backend/sudoku/points.mjs';
import {sqliteD1} from './sqlite-d1.mjs';
import {LocalPointsProvider} from './sudoku-points-local-provider.mjs';
const dataDir=process.env.SUDOKU_DATA_DIR||'tmp/sudoku-local';await mkdir(dataDir,{recursive:true});
const{db,sqlite}=sqliteD1(dataDir+'/progress.sqlite');for(const name of ['0049_sudoku','0050_sudoku_speed','0051_sudoku_points','0052_sudoku_point_products','0053_ai_credit_help'])sqlite.exec(await readFile('backend/migrations/'+name+'.sql','utf8'));
const port=Number(process.env.SUDOKU_PORT||5654),origin=process.env.SUDOKU_ORIGIN||'http://127.0.0.1:5653';
if(new URL(origin).hostname!=='127.0.0.1')throw Error('Local server requires loopback origin');
const provider=process.env.SUDOKU_POINTS_TEST==='true'?new LocalPointsProvider(origin,dataDir+'/stripe-simulator.json'):null;await provider?.load();
const env=provider?provider.env(db):{DB:db,PUBLIC_ORIGIN:origin,SUDOKU_LOCAL:'true'};env.SUDOKU_SPEED_ENABLED='true';
const store=new D1SudokuStore(db),points=new PointsStore(db),authenticate=async r=>r.headers.get('cookie')?.match(/sudoku_local_account=([a-f0-9-]+)/)?.[1]||null;
const clock=()=>process.env.SUDOKU_TEST_NOW?Date.parse(process.env.SUDOKU_TEST_NOW):Date.now();
let localPublicCatalog=null;try{const html=await readFile('dist/client/en/index.html','utf8');localPublicCatalog=JSON.parse(html.match(/<script[^>]*id="public-release-data"[^>]*>([\s\S]*?)<\/script>/)[1]).catalog;}catch{}
http.createServer(async(req,res)=>{try{const chunks=[];for await(const c of req)chunks.push(c);const u=new URL(req.url,origin),body=Buffer.concat(chunks),request=new Request(u,{method:req.method,headers:req.headers,...(!['GET','HEAD'].includes(req.method)?{body}:{})});let response;
 if(u.pathname==='/api/v1/health')response=Response.json({status:'configured_runtime',account:true,local:true,checkout:false,checkoutMode:'disabled'});
 else if(u.pathname==='/api/v1/catalog'&&localPublicCatalog)response=Response.json(localPublicCatalog);
 else if(/^\/api\/v1\/legal\/(terms|refunds|privacy|cookies)$/.test(u.pathname))response=Response.json(createPolicyDocuments()[u.pathname.split('/').at(-1)]);
 else if(u.pathname==='/api/v1/auth/session')response=Response.json({available:true,authenticated:Boolean(await authenticate(request))});
 else if(u.pathname==='/api/v1/sudoku/local-login'&&req.method==='POST'){if(req.headers.origin!==origin)throw Error('Local origin required');response=Response.json({local:true},{headers:{'set-cookie':`sudoku_local_account=${crypto.randomUUID()}; HttpOnly; SameSite=Lax; Path=/`}});}
 else if(u.pathname==='/api/v1/auth/logout'&&req.method==='POST'){if(req.headers.origin!==origin)throw Error('Local origin required');response=new Response('{}',{headers:{'set-cookie':'sudoku_local_account=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0'}});}
 else if(provider&&u.pathname.startsWith('/__points-test/')){
  const id=u.pathname.split('/')[2],session=provider.sessions[id],who=await authenticate(request),order=session&&await points.order(session.metadata.points_order,'account:'+who);
  if(!order||!who)response=new Response('Sign in with the account owning this local test checkout.',{status:403});
  else if(req.method==='POST'){if(req.headers.origin!==origin)throw Error('Local origin required');const input=new URLSearchParams(body.toString());if(input.get('action')==='pay'){await provider.pay(id);if(!input.has('delay'))await pointsWebhook(provider.event(session),env,{store:points});}else{session.status='expired';await provider.save();}response=new Response(null,{status:303,headers:{location:input.get('action')==='pay'?session.success_url:session.cancel_url}});}
  else response=new Response(`<!doctype html><html lang="en"><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Local points payment simulator</title><style>body{font:17px/1.7 system-ui;background:#edf4ee;color:#204a41;padding:32px;max-width:650px;margin:auto}main{padding:30px;background:#fffdf7;border:1px solid #bdd0c1;border-radius:14px}button{padding:14px 20px;margin:12px 8px 0 0;font:inherit;background:#28634f;color:white;border:0;border-radius:7px}label{display:block}small{overflow-wrap:anywhere}</style><main><strong>LOCAL SIMULATOR · NO MONEY · NO CARD DETAILS</strong><h1>Test a points purchase</h1><p>${order.points} points · USD ${(order.amount/100).toFixed(2)}</p><p>This is an isolated developer test. It is not a Stripe-hosted checkout or a real purchase.</p><small>Order ${order.id}</small><form method="post"><label><input type="checkbox" name="delay">Delay the notification to test return-page reconciliation</label><button name="action" value="pay">Simulate confirmed payment</button><button name="action" value="cancel">Cancel test checkout</button></form></main>`,{headers:{'content-type':'text/html','x-robots-tag':'noindex'}});
 }
 else if(u.pathname==='/api/v1/credits/health')response=await creditsHealth(env);
 else if(u.pathname==='/api/v1/credits/context')response=await creditsContext(request,env,{authenticate,clock});
 else if(u.pathname.startsWith('/api/v1/credits/games/'))response=await creditGameHelpApi(request,env,{authenticate,clock});
 else if(u.pathname.startsWith('/api/v1/sudoku/points/')||u.pathname.startsWith('/api/v1/credits/'))response=await pointsApi(request,env,{store:points,authenticate,clock,authorizeAdmin:async()=>false,ensureAccount:async(owner,merge,original)=>{await store.ensure(owner,true);if(merge){const url=new URL(original.url);url.pathname='/api/v1/sudoku/progress';return(await sudokuApi(new Request(url,{headers:original.headers}),env,{store,authenticate,clock})).json();}}});
 else if(u.pathname.startsWith('/api/v1/sudoku/'))response=await sudokuApi(request,env,{store,authenticate,clock});
 else response=new Response('Not found',{status:404});
 res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
 }catch{res.writeHead(500,{'content-type':'text/plain'});res.end('Local API failure');}}).listen(port,'127.0.0.1',()=>console.log(`Sudoku isolated API on ${port}; points simulator ${provider?'enabled (no real money)':'disabled'}.`));
